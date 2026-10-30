using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;
using System.Web.Script.Serialization;

static class Program {
    public static readonly string Root = AppDomain.CurrentDomain.BaseDirectory;
    public static readonly byte[] Entropy = Encoding.UTF8.GetBytes("PrismaImagem/credential/v1");
    public static string Vault { get { return Path.Combine(Root, "data", "credential.bin"); } }
    [STAThread] static int Main(string[] args) {
        if (args.Length == 2 && args[0] == "--self-test") {
            try {
                byte[] test = Encoding.UTF8.GetBytes("dummy-self-test-only");
                byte[] encrypted = ProtectedData.Protect(test, Entropy, DataProtectionScope.CurrentUser);
                byte[] plain = ProtectedData.Unprotect(encrypted, Entropy, DataProtectionScope.CurrentUser);
                if (Encoding.UTF8.GetString(plain) != "dummy-self-test-only" || encrypted.Length <= test.Length) throw new Exception();
                foreach (string file in new [] {"runtime/node.exe", "app/desktop.mjs", "app/server.mjs", "app/local-provider.mjs", "app/background-provider.mjs", "app/background-worker.py", "app/public/index.html", "app/public/app.js", "app/public/style.css", "setup-local.ps1", "API-LOCAL.md"})
                    if (!File.Exists(Path.Combine(Root, file))) throw new FileNotFoundException(file);
                Array.Clear(test, 0, test.Length); Array.Clear(plain, 0, plain.Length);
                File.WriteAllText(args[1], "PASS: Windows DPAPI CurrentUser roundtrip; packaged application files present. No real credential used.");
                return 0;
            } catch { File.WriteAllText(args[1], "FAIL: DPAPI or package validation failed."); return 1; }
        }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        using (var form = new Launcher()) Application.Run(form);
        return 0;
    }
}

sealed class Launcher : Form {
    TextBox keyBox;
    Label state;
    Button save, remove, open;
    Process child;
    Process engine;
    bool closing, ready;
    Studio studio;
    string address;
    readonly string token = Guid.NewGuid().ToString("N")+Guid.NewGuid().ToString("N");
    public Launcher() {
        Text = "PrismaImagem | Controle do estúdio";
        ClientSize = new Size(560, 440); MinimumSize = MaximumSize = Size;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(20,18,27); ForeColor = Color.FromArgb(232,222,245);
        Font = new Font("Segoe UI", 10);
        Label title = new Label { Text = "PrismaImagem", Font = new Font("Segoe UI", 25, FontStyle.Bold), AutoSize = true, Location = new Point(30,24) };
        Label description = new Label { Text = "Motor local sem chave OpenAI; nuvem opcional.\nA tela principal abre em uma janela própria do aplicativo.", Location = new Point(33,83), Size = new Size(490,50) };
        Label keyLabel = new Label { Text = "Chave da API OpenAI", AutoSize = true, Location = new Point(33,150) };
        keyBox = new TextBox { UseSystemPasswordChar = true, Location = new Point(33,179), Width = 490, BackColor = Color.FromArgb(40,34,50), ForeColor = ForeColor, BorderStyle = BorderStyle.FixedSingle, MaxLength = 512 };
        save = ButtonAt("Salvar chave",33,218,148); remove = ButtonAt("Remover chave",192,218,156);
        open = ButtonAt("Tentar novamente",360,218,163); open.Enabled = true;
        state = new Label { Text = "Iniciando estúdio...", Location = new Point(33,278), Size = new Size(490,65), ForeColor = Color.FromArgb(204,177,242) };
        Label note = new Label { Text = "A chave é criptografada pelo Windows para seu usuário.\nNão é salva em .env nem enviada ao navegador.\nFechar as configurações mantém o estúdio aberto.", Location = new Point(33,352), Size = new Size(490,70), Font = new Font("Segoe UI",9), ForeColor = Color.FromArgb(160,149,176) };
        Controls.AddRange(new Control[] {title,description,keyLabel,keyBox,save,remove,open,state,note});
        save.Click += delegate { SaveKey(); };
        remove.Click += delegate { RemoveKey(); };
        open.Click += delegate { if(ready)OpenStudio();else {StopStudio();StartStudio(true);} };
        Shown += delegate { StartStudio(true); };
        FormClosing += delegate(object sender,FormClosingEventArgs e) {if(!closing&&studio!=null&&!studio.IsDisposed){e.Cancel=true;Hide();return;}closing = true; StopStudio(); if(engine!=null){try { if(!engine.HasExited)engine.Kill(); }catch{}finally{engine.Dispose();}} };
    }
    Button ButtonAt(string text, int x, int y, int width) {
        var button = new Button { Text = text, Location = new Point(x,y), Size = new Size(width,37), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(55,40,73), ForeColor = ForeColor };
        return button;
    }
    string ReadKey() {
        if (!File.Exists(Program.Vault)) return "";
        byte[] raw = ProtectedData.Unprotect(File.ReadAllBytes(Program.Vault), Program.Entropy, DataProtectionScope.CurrentUser);
        try { return Encoding.UTF8.GetString(raw); } finally { Array.Clear(raw,0,raw.Length); }
    }
    void SaveKey() {
        string value = keyBox.Text.Trim();
        if (value.Length < 20 || value.IndexOfAny(new char[] {'\r','\n','\t',' '}) >= 0) { state.Text = "Cole uma chave válida da API OpenAI, sem espaços."; return; }
        try {
            byte[] raw = Encoding.UTF8.GetBytes(value);
            byte[] encrypted;
            try { encrypted = ProtectedData.Protect(raw, Program.Entropy, DataProtectionScope.CurrentUser); } finally { Array.Clear(raw,0,raw.Length); }
            Directory.CreateDirectory(Path.GetDirectoryName(Program.Vault));
            string pending = Program.Vault + ".pending";
            File.WriteAllBytes(pending,encrypted);
            if (File.Exists(Program.Vault)) File.Replace(pending,Program.Vault,null); else File.Move(pending,Program.Vault);
            keyBox.Clear(); value = null;
            StopStudio(); StartStudio(false);
        } catch { state.Text = "Não foi possível salvar. Verifique a permissão de escrita da pasta."; }
    }
    void RemoveKey() {
        if (MessageBox.Show("Remover a chave salva? O estúdio será reiniciado e pedidos em andamento serão interrompidos.", "PrismaImagem", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
        try { if(File.Exists(Program.Vault)) File.Delete(Program.Vault); keyBox.Clear(); StopStudio(); StartStudio(false); }
        catch { state.Text = "Não foi possível remover a chave salva."; }
    }
    void StopStudio() {
        ready = false; open.Enabled = true;open.Text="Tentar novamente";
        var old = child; child = null;
        if (old != null) { try { old.StandardInput.Close(); if(!old.WaitForExit(1500)) { old.Kill(); old.WaitForExit(1500); } } catch {} finally { old.Dispose(); } }
    }
    void StartStudio(bool autoOpen) {
        StartLocalEngine();
        string key = "";
        try { key = ReadKey(); }
        catch { state.Text = "A chave salva não pode ser lida por este usuário. Cadastre uma nova chave ou remova a anterior."; return; }
        bool configured = key.Length > 0;
        try {
            foreach(string file in new [] {"runtime/node.exe","app/desktop.mjs","app/server.mjs","app/local-provider.mjs","app/background-provider.mjs","app/background-worker.py"}) {
                if(!File.Exists(Path.Combine(Program.Root,file))){state.Text="Arquivo ausente: "+file+". Extraia todo o ZIP para a mesma pasta.";LogStartup("MISSING_FILE:"+file);return;}
            }
            var info = new ProcessStartInfo(Path.Combine(Program.Root,"runtime","node.exe"), "\"" + Path.Combine(Program.Root,"app","desktop.mjs") + "\"");
            info.WorkingDirectory = Program.Root; info.UseShellExecute = false; info.CreateNoWindow = true;
            info.RedirectStandardInput = info.RedirectStandardOutput = info.RedirectStandardError = true;
            info.EnvironmentVariables.Remove("OPENAI_API_KEY"); info.EnvironmentVariables.Remove("NODE_OPTIONS"); info.EnvironmentVariables.Remove("NODE_PATH");
            var process = new Process { StartInfo = info, EnableRaisingEvents = true };
            child = process;
            string failure=null;
            process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) {
                if(e.Data!=null && e.Data.StartsWith("READY:")) {
                    int port;if(!int.TryParse(e.Data.Substring(6),out port)||port<1||port>65535)return;
                    LogStartup("READY:"+port);
                    UpdateUI(delegate { if(child != process)return; address="http://127.0.0.1:"+port;ready = true; open.Enabled = true;open.Text="Abrir estúdio";state.Text = configured ? "Estúdio pronto. Chave opcional protegida salva." : "Estúdio pronto. O motor local não exige chave OpenAI.\nInstale e inicie o ComfyUI para gerar localmente.";if(studio!=null)studio.SetServer(address);if(autoOpen) OpenStudio();else if(studio!=null) { var ignored=studio.RefreshStatus(); } });
                }
            };
            process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e) {
                if(e.Data==null)return;
                if(e.Data.StartsWith("START_FAILED:")){failure=SafeCode(e.Data.Substring(13));LogStartup(failure);}
                else if(e.Data.Contains("ERR_MODULE_NOT_FOUND")||e.Data.Contains("MODULE_NOT_FOUND")){failure="MISSING_MODULE";LogStartup(failure);}
                else if(e.Data.Contains("SyntaxError")){failure="SCRIPT_INVALID";LogStartup(failure);}
            };
            process.Exited += delegate {try{process.WaitForExit();}catch{}int code;try{code=process.ExitCode;}catch{code=-1;}LogStartup("EXIT:"+code);UpdateUI(delegate { if(child != process)return;ready=false;open.Enabled=true;open.Text="Tentar novamente";if(!closing)state.Text=StartupMessage(failure,code); }); };
            process.Start(); process.BeginOutputReadLine(); process.BeginErrorReadLine();
            // A chave passa por um pipe anônimo, nunca pela linha de comando ou ambiente.
            string config=new JavaScriptSerializer().Serialize(new { key=key,token=token,port=0 });
            process.StandardInput.WriteLine(Convert.ToBase64String(Encoding.UTF8.GetBytes(config)));
            process.StandardInput.Flush(); key = null;
            state.Text = "Iniciando estúdio...";
        } catch (Exception error) { key = null; StopStudio();LogStartup("START_EXCEPTION:"+error.GetType().Name);state.Text = "Não foi possível executar o servidor. Confira se runtime/node.exe está presente e permitido pelo Windows. Consulte data/startup.log."; }
    }
    static string SafeCode(string code){foreach(string allowed in new [] {"CONFIG_TIMEOUT","CONFIG_INVALID","MISSING_MODULE","EADDRINUSE","EACCES","LISTEN_FAILED","BOOT_ERROR"})if(code==allowed)return code;return "BOOT_ERROR";}
    static string StartupMessage(string code,int exit){
        if(code=="MISSING_MODULE")return "Faltam arquivos do servidor. Extraia todo o ZIP, incluindo app/local-provider.mjs. Consulte data/startup.log.";
        if(code=="CONFIG_INVALID")return "Configuração local inválida. Confira COMFYUI_URL no ambiente Windows. Consulte data/startup.log.";
        if(code=="EACCES")return "O Windows recusou a porta local. Consulte data/startup.log e as permissões do aplicativo.";
        if(code=="EADDRINUSE")return "A porta solicitada já está em uso. Clique em Tentar novamente.";
        if(code=="SCRIPT_INVALID")return "Um arquivo do servidor está inválido ou incompleto. Extraia novamente o pacote completo.";
        return "O servidor encerrou (código "+exit+"). Clique em Tentar novamente. Diagnóstico: data/startup.log.";
    }
    static readonly object logLock=new object();
    static void LogStartup(string message){try{lock(logLock){string directory=Path.Combine(Program.Root,"data");Directory.CreateDirectory(directory);File.AppendAllText(Path.Combine(directory,"startup.log"),DateTime.UtcNow.ToString("o")+" "+message+Environment.NewLine);}}catch{}}
    void UpdateUI(Action update) { if(closing || IsDisposed || !IsHandleCreated)return; try { BeginInvoke(update); } catch {} }
    void StartLocalEngine() {
        if(engine!=null){try{if(!engine.HasExited)return;}catch{}}
        string folder=Path.Combine(Program.Root,"engines","ComfyUI_windows_portable");
        string python=Path.Combine(folder,"python_embeded","python.exe");
        if(!File.Exists(python)||!File.Exists(Path.Combine(folder,"ComfyUI","main.py"))){LogStartup("ENGINE_NOT_INSTALLED");return;}
        try{
            string data=Path.Combine(Program.Root,"data");Directory.CreateDirectory(data);
            foreach(string directory in new [] {"comfy-user","comfy-output","comfy-input","comfy-temp","hf-cache","torch-cache","python-cache"})Directory.CreateDirectory(Path.Combine(data,directory));
            var info=new ProcessStartInfo(python,"-s \""+Path.Combine(folder,"ComfyUI","main.py")+"\" --windows-standalone-build --listen 127.0.0.1 --port 8188 --disable-auto-launch --lowvram --user-directory \""+Path.Combine(data,"comfy-user")+"\" --output-directory \""+Path.Combine(data,"comfy-output")+"\" --input-directory \""+Path.Combine(data,"comfy-input")+"\" --temp-directory \""+Path.Combine(data,"comfy-temp")+"\"");
            info.WorkingDirectory=folder;info.UseShellExecute=false;info.CreateNoWindow=true;
            info.RedirectStandardInput=true;info.RedirectStandardOutput=true;info.RedirectStandardError=true;
            info.EnvironmentVariables["HF_HOME"]=Path.Combine(data,"hf-cache");
            info.EnvironmentVariables["TORCH_HOME"]=Path.Combine(data,"torch-cache");
            info.EnvironmentVariables["PYTHONPYCACHEPREFIX"]=Path.Combine(data,"python-cache");
            info.EnvironmentVariables.Remove("OPENAI_API_KEY");
            var localProcess=new Process {StartInfo=info,EnableRaisingEvents=true};
            localProcess.OutputDataReceived+=delegate(object sender,DataReceivedEventArgs e){if(e.Data!=null)LogEngine(e.Data);};
            localProcess.ErrorDataReceived+=delegate(object sender,DataReceivedEventArgs e){if(e.Data!=null)LogEngine(e.Data);};
            localProcess.Exited+=delegate{try{localProcess.WaitForExit();LogEngine("PROCESS_EXIT:"+localProcess.ExitCode);}catch{}};
            engine=localProcess;LogEngine("START");localProcess.Start();localProcess.BeginOutputReadLine();localProcess.BeginErrorReadLine();
        }catch(Exception error){LogEngine("START_FAILED:"+error.GetType().Name);state.Text="O motor local não pôde iniciar. Consulte data/comfy-engine.log.";}
    }
    static void LogEngine(string message){try{lock(logLock){string directory=Path.Combine(Program.Root,"data");Directory.CreateDirectory(directory);string log=Path.Combine(directory,"comfy-engine.log");if(File.Exists(log)&&new FileInfo(log).Length>2*1024*1024)File.WriteAllText(log,"");File.AppendAllText(log,DateTime.UtcNow.ToString("o")+" "+message+Environment.NewLine);}}catch{}}
    public string EngineMessage(){try{if(engine!=null)return engine.HasExited?"O motor local encerrou. Consulte data/comfy-engine.log.":"O processo do motor está ligado, mas a conexão ainda não ficou pronta. Aguarde; detalhes em data/comfy-engine.log.";}catch{}return "O aplicativo não iniciou o motor local. Verifique data/comfy-engine.log e a localização da pasta engines.";}
    public void Shutdown(){closing=true;Close();}
    void OpenStudio() {
        if (!ready) return;
        if(studio==null || studio.IsDisposed)studio=new Studio(this,token,address);
        studio.Show();studio.Activate();Hide();
    }
}
