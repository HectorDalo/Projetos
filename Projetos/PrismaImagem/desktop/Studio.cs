using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

sealed class Studio : Form {
    readonly Launcher control;
    readonly string token;
    string address;
    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 60 * 1024 * 1024 };
    readonly string history = Path.Combine(Program.Root,"data","native-history");
    TextBox prompt;
    ComboBox mode,provider,format,quality,upscaleSize;
    Label upscaleLabel;
    Label status,referenceLabel;
    Button generate,upload,download,reuse,settings,selectArea,undo;
    readonly Stack<KeyValuePair<string,string>> previousImages=new Stack<KeyValuePair<string,string>>();
    NumericUpDown strength;
    Panel strengthPanel;
    Label promptLabel;
    ProgressBar progress;
    PictureBox preview;
    FlowLayoutPanel gallery;
    string reference,currentFile,currentPrompt,referencePrompt,selectedMask;
    bool busy;
    public Studio(Launcher launcher,string sessionToken,string serverAddress) {
        control=launcher;token=sessionToken;address=serverAddress;
        Text="PrismaImagem — Estúdio";ClientSize=new Size(1180,820);MinimumSize=new Size(1000,720);
        StartPosition=FormStartPosition.CenterScreen;BackColor=Color.FromArgb(18,16,24);ForeColor=Color.FromArgb(236,225,250);Font=new Font("Segoe UI",10);DoubleBuffered=true;
        var root=new TableLayoutPanel { Dock=DockStyle.Fill,ColumnCount=1,RowCount=4,Padding=new Padding(24) };
        root.RowStyles.Add(new RowStyle(SizeType.Absolute,82));root.RowStyles.Add(new RowStyle(SizeType.Percent,100));root.RowStyles.Add(new RowStyle(SizeType.Absolute,56));root.RowStyles.Add(new RowStyle(SizeType.Absolute,110));Controls.Add(root);
        var header=new Panel {Dock=DockStyle.Fill};header.Controls.Add(new Label {Text="PrismaImagem",Font=new Font("Segoe UI",26,FontStyle.Bold),AutoSize=true,Location=new Point(0,0)});
        header.Controls.Add(new Label {Text="Da ideia à imagem. Seu estúdio, no seu computador.",AutoSize=true,Location=new Point(3,49),ForeColor=Color.FromArgb(165,150,185)});
        settings=MakeButton("Configurações",160);settings.Anchor=AnchorStyles.Top|AnchorStyles.Right;settings.Location=new Point(930,12);header.Resize+=delegate {settings.Left=header.Width-settings.Width;};settings.Click+=delegate{control.Show();control.Activate();};header.Controls.Add(settings);root.Controls.Add(header,0,0);
        var body=new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=2,RowCount=1};body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,390));body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));root.Controls.Add(body,0,1);
        var leftShell=new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=1,RowCount=2,Padding=new Padding(0,0,12,0)};leftShell.RowStyles.Add(new RowStyle(SizeType.Percent,100));leftShell.RowStyles.Add(new RowStyle(SizeType.Absolute,54));body.Controls.Add(leftShell,0,0);
        var fields=new FlowLayoutPanel {Dock=DockStyle.Fill,FlowDirection=FlowDirection.TopDown,WrapContents=false,AutoScroll=true,Padding=new Padding(0,0,10,8)};leftShell.Controls.Add(fields,0,0);
        fields.Controls.Add(Caption("MOTOR DE IMAGENS"));provider=Select(new [] {"Local · sem chave OpenAI","OpenAI · chave e créditos"});fields.Controls.Add(provider);
        fields.Controls.Add(Caption("AÇÃO"));mode=Select(new [] {"Gerar nova imagem","Ampliar · Full HD ou 2× (Local)","Transformar por descrição","Remover fundo · PNG transparente","Remover área marcada (Local)"});fields.Controls.Add(mode);
        var options=new TableLayoutPanel {Width=350,Height=65,ColumnCount=2,RowCount=2,Margin=new Padding(0)};options.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,50));options.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,50));options.Controls.Add(new Label {Text="FORMATO",AutoSize=true},0,0);options.Controls.Add(new Label {Text="QUALIDADE",AutoSize=true},1,0);format=Select(new [] {"Quadrado","Paisagem","Retrato"});quality=Select(new [] {"Rápida","Equilibrada","Alta"});quality.SelectedIndex=1;format.Width=quality.Width=166;options.Controls.Add(format,0,1);options.Controls.Add(quality,1,1);fields.Controls.Add(options);
        promptLabel=Caption("DESCREVA A IMAGEM");fields.Controls.Add(promptLabel);
        prompt=new TextBox {Multiline=true,Width=350,Height=125,MaxLength=4000,ScrollBars=ScrollBars.Vertical,BackColor=Color.FromArgb(33,27,43),ForeColor=ForeColor,BorderStyle=BorderStyle.FixedSingle};fields.Controls.Add(prompt);
        upscaleLabel=Caption("SAÍDA · FULL HD USA CORTE CENTRAL");fields.Controls.Add(upscaleLabel);upscaleSize=Select(new [] {"2× · manter proporções","Full HD · 1920 × 1080","Full HD vertical · 1080 × 1920"});fields.Controls.Add(upscaleSize);
        upload=MakeButton("Adicionar imagem de referência",350);fields.Controls.Add(upload);referenceLabel=Caption("PNG, JPEG ou WebP · até 10 MB");referenceLabel.Height=24;fields.Controls.Add(referenceLabel);
        selectArea=MakeButton("Marcar pessoa ou objeto a remover",350);fields.Controls.Add(selectArea);selectArea.Click+=delegate{if(reference==null){status.Text="Adicione uma imagem ou use o resultado atual primeiro.";return;}try{using(var editor=new SelectionEditor(reference)){if(editor.ShowDialog(this)==DialogResult.OK){selectedMask=editor.Mask;reference=editor.NormalizedReference;status.Text="Área selecionada. Descreva o fundo desejado e clique em Remover área marcada.";}}}catch{status.Text="Não foi possível abrir a seleção. Use uma referência PNG/JPEG de até 20 megapixels.";}};
        strengthPanel=new Panel {Width=350,Height=62};strengthPanel.Controls.Add(new Label {Text="INTENSIDADE · menor preserva mais",AutoSize=true,Location=new Point(0,2)});strength=new NumericUpDown {Minimum=0.05M,Maximum=0.8M,DecimalPlaces=2,Increment=0.05M,Value=0.25M,Location=new Point(0,28),Width=110,BackColor=Color.FromArgb(40,32,50),ForeColor=ForeColor};strengthPanel.Controls.Add(strength);fields.Controls.Add(strengthPanel);
        generate=MakeButton("Gerar imagem",350);generate.Dock=DockStyle.Fill;generate.BackColor=Color.FromArgb(181,144,233);generate.ForeColor=Color.FromArgb(30,18,45);leftShell.Controls.Add(generate,0,1);
        var canvas=new TableLayoutPanel {Dock=DockStyle.Fill,BackColor=Color.FromArgb(27,22,35),Padding=new Padding(12),ColumnCount=1,RowCount=3};canvas.RowStyles.Add(new RowStyle(SizeType.Absolute,8));canvas.RowStyles.Add(new RowStyle(SizeType.Percent,100));canvas.RowStyles.Add(new RowStyle(SizeType.Absolute,52));body.Controls.Add(canvas,1,0);
        progress=new ProgressBar {Dock=DockStyle.Fill,Style=ProgressBarStyle.Marquee,MarqueeAnimationSpeed=35,Visible=false};canvas.Controls.Add(progress,0,0);
        var actions=new FlowLayoutPanel {Dock=DockStyle.Fill};download=MakeButton("Baixar PNG",130);reuse=MakeButton("Usar resultado",145);undo=MakeButton("Desfazer",100);download.Enabled=reuse.Enabled=undo.Enabled=false;actions.Controls.Add(download);actions.Controls.Add(reuse);actions.Controls.Add(undo);canvas.Controls.Add(actions,0,2);
        preview=new TransparencyPreview {Dock=DockStyle.Fill,SizeMode=PictureBoxSizeMode.Zoom,Cursor=Cursors.Hand};canvas.Controls.Add(preview,0,1);
        status=new Label {Dock=DockStyle.Fill,Text="Verificando motor local...",ForeColor=Color.FromArgb(201,174,234),AutoEllipsis=true,Padding=new Padding(0,12,0,0)};root.Controls.Add(status,0,2);
        gallery=new FlowLayoutPanel {Dock=DockStyle.Fill,AutoScroll=true,WrapContents=false};root.Controls.Add(gallery,0,3);
        upload.Click+=delegate{Upload();};generate.Click+=async delegate{await Generate();};download.Click+=delegate{Download();};reuse.Click+=delegate{if(currentFile==null)return;reference="data:image/png;base64,"+Convert.ToBase64String(File.ReadAllBytes(currentFile));referencePrompt=currentPrompt;selectedMask=null;referenceLabel.Text="Referência: resultado atual";mode.SelectedIndex=provider.SelectedIndex==0?1:2;prompt.Text=currentPrompt;UpdateMode();status.Text="Referência pronta. Ampliar preserva a imagem; transformar pode alterar seus detalhes.";};
        undo.Click+=delegate{if(busy||previousImages.Count==0)return;var previous=previousImages.Pop();try{ShowImage(previous.Key,false);currentPrompt=previous.Value;prompt.Text=currentPrompt;status.Text="Resultado anterior restaurado. As versões continuam no histórico.";}catch{status.Text="Não foi possível recuperar esse resultado.";}undo.Enabled=previousImages.Count>0;};
        preview.Click+=delegate{if(preview.Image==null)return;using(var full=new Form {Text="PrismaImagem — Visualização",WindowState=FormWindowState.Maximized,BackColor=BackColor}){full.Controls.Add(new PictureBox {Dock=DockStyle.Fill,Image=preview.Image,SizeMode=PictureBoxSizeMode.Zoom});full.ShowDialog(this);}};
        provider.SelectedIndexChanged+=async delegate{if(provider.SelectedIndex==1&&new []{1,3,4}.Contains(mode.SelectedIndex))mode.SelectedIndex=2;UpdateMode();await RefreshStatus();};mode.SelectedIndexChanged+=delegate{if(mode.SelectedIndex==4)prompt.Text="empty natural background, continuation of the surrounding scene, no people, no objects";UpdateMode();};UpdateMode();
        var timer=new Timer {Interval=10000};timer.Tick+=async delegate{if(currentFile==null&&!busy)await RefreshStatus();};timer.Start();
        Shown+=async delegate{LoadHistory();await RefreshStatus();};FormClosing+=delegate(object sender,FormClosingEventArgs e){if(busy&&MessageBox.Show("Há uma imagem sendo processada. Deseja encerrar o aplicativo?","PrismaImagem",MessageBoxButtons.YesNo,MessageBoxIcon.Question)!=DialogResult.Yes)e.Cancel=true;};FormClosed+=delegate{timer.Stop();timer.Dispose();if(preview.Image!=null)preview.Image.Dispose();control.Shutdown();};
    }
    Label Caption(string text) {return new Label {Text=text,Width=350,Height=22,ForeColor=Color.FromArgb(170,155,190),Margin=new Padding(0,6,0,2),AutoEllipsis=true};}
    ComboBox Select(string[] values) {var box=new ComboBox {Width=350,DropDownStyle=ComboBoxStyle.DropDownList,BackColor=Color.FromArgb(40,32,50),ForeColor=ForeColor,FlatStyle=FlatStyle.Flat,Margin=new Padding(0,0,0,4)};box.Items.AddRange(values);box.SelectedIndex=0;return box;}
    Button MakeButton(string text,int width) {return new StudioButton {Text=text,Width=width,Height=38,FlatStyle=FlatStyle.Flat,BackColor=Color.FromArgb(52,38,69),ForeColor=ForeColor,Margin=new Padding(0,6,8,4)};}
    void UpdateMode(){
        bool upscale=mode.SelectedIndex==1,background=mode.SelectedIndex==3,inpaint=mode.SelectedIndex==4;
        upscaleSize.Visible=upscaleLabel.Visible=upscale;
        prompt.Visible=promptLabel.Visible=!upscale&&!background;
        promptLabel.Text=inpaint?"DESCREVA O FUNDO A RECONSTRUIR":mode.SelectedIndex==2&&provider.SelectedIndex==0?"DESCREVA O RESULTADO DESEJADO":"DESCREVA A IMAGEM";
        upload.Visible=referenceLabel.Visible=mode.SelectedIndex!=0;
        selectArea.Visible=inpaint;
        strengthPanel.Visible=mode.SelectedIndex==2&&provider.SelectedIndex==0;
        format.Enabled=!busy&&(mode.SelectedIndex==0||mode.SelectedIndex==2);
        quality.Enabled=!busy&&!upscale&&!background;
        generate.Text=busy?"Processando…":upscale?"Ampliar sem recriar":background?"Remover fundo":inpaint?"Remover área marcada":mode.SelectedIndex==2?"Transformar imagem":"Gerar imagem";
    }
    void SetBusy(bool value){busy=value;generate.Enabled=provider.Enabled=mode.Enabled=upload.Enabled=prompt.Enabled=strength.Enabled=settings.Enabled=upscaleSize.Enabled=selectArea.Enabled=!value;download.Enabled=reuse.Enabled=!value&&currentFile!=null;undo.Enabled=!value&&previousImages.Count>0;preview.Enabled=!value;progress.Visible=value;UpdateMode();}
    async Task<Dictionary<string,object>> Api(string path,object body=null) {
        var request=(HttpWebRequest)WebRequest.Create(address+path);request.Proxy=null;request.Timeout=660000;request.ReadWriteTimeout=660000;request.Headers["Authorization"]="Bearer "+token;
        if(body!=null){request.Method="POST";request.ContentType="application/json";byte[] bytes=Encoding.UTF8.GetBytes(json.Serialize(body));request.ContentLength=bytes.Length;using(var stream=await request.GetRequestStreamAsync())await stream.WriteAsync(bytes,0,bytes.Length);}
        HttpWebResponse response;
        try {response=(HttpWebResponse)await request.GetResponseAsync();}catch(WebException error){if(error.Response==null)throw new Exception("O servidor local não está disponível. Verifique a janela de controle.");response=(HttpWebResponse)error.Response;}
        using(response)using(var reader=new StreamReader(response.GetResponseStream(),Encoding.UTF8)) {var data=json.Deserialize<Dictionary<string,object>>(await reader.ReadToEndAsync());if((int)response.StatusCode>=400)throw new Exception(data.ContainsKey("error")?Convert.ToString(data["error"]):"Falha na API PrismaImagem.");return data;}
    }
    public async Task RefreshStatus() {
        if(busy||IsDisposed)return;
        int selected=provider.SelectedIndex;
        try {
            var data=await Api("/v1/health");
            if(IsDisposed||busy||provider.SelectedIndex!=selected)return;
            var engine=(Dictionary<string,object>)data[selected==0?"local":"openai"];
            if(selected==0){
                bool connected=engine.ContainsKey("connected")&&Convert.ToBoolean(engine["connected"]);
                status.Text=mode.SelectedIndex==1&&connected?"Motor conectado. Ampliação sem recriar disponível.":Convert.ToBoolean(engine["ready"])||connected?Convert.ToString(engine["message"]):control.EngineMessage();
            }else status.Text=Convert.ToBoolean(engine["configured"])?"OpenAI configurada. As operações podem ter custos.":"Cadastre a chave OpenAI em Configurações ou use o motor local.";
        }catch(Exception error){if(!IsDisposed&&!busy)status.Text=error.Message;}
    }
    public void SetServer(string serverAddress){address=serverAddress;}
    void Upload(){using(var dialog=new OpenFileDialog {Filter="Imagens|*.png;*.jpg;*.jpeg;*.webp",Title="Selecionar referência"}){if(dialog.ShowDialog(this)!=DialogResult.OK)return;try{var info=new FileInfo(dialog.FileName);if(info.Length>10*1024*1024)throw new Exception("Escolha uma imagem de até 10 MB.");string ext=info.Extension.ToLowerInvariant();string mime=ext==".png"?"png":ext==".webp"?"webp":"jpeg";reference="data:image/"+mime+";base64,"+Convert.ToBase64String(File.ReadAllBytes(info.FullName));referencePrompt=null;selectedMask=null;referenceLabel.Text=info.Name;if(mode.SelectedIndex==0)mode.SelectedIndex=provider.SelectedIndex==0?1:2;}catch(Exception error){status.Text=error.Message;}}}
    async Task Generate(){if(busy)return;bool upscale=mode.SelectedIndex==1;bool background=mode.SelectedIndex==3;bool inpaint=mode.SelectedIndex==4;bool editing=mode.SelectedIndex!=0;if(inpaint&&selectedMask==null){status.Text="Marque a área a remover primeiro.";return;}if(!upscale&&!background&&string.IsNullOrWhiteSpace(prompt.Text)){status.Text="Descreva a imagem que deseja criar.";return;}if(editing&&reference==null){status.Text="Adicione uma imagem de referência para editar.";return;}var sizes=new [] {"1024x1024","1536x1024","1024x1536"};var qualities=new [] {"low","medium","high"};var payload=new Dictionary<string,object>{{"prompt",background?(referencePrompt??"Imagem sem fundo"):upscale?(referencePrompt??"Imagem ampliada sem recriar"):prompt.Text},{"provider",provider.SelectedIndex==0?"local":"openai"},{"size",sizes[format.SelectedIndex]},{"quality",qualities[quality.SelectedIndex]}};if(editing){payload["image"]=reference;if(provider.SelectedIndex==0){payload["editAction"]=background?"remove-background":inpaint?"inpaint":upscale?"upscale":"transform";if(inpaint)payload["mask"]=selectedMask;if(upscale)payload["upscaleTarget"]=new [] {"2x","fullhd","fullhd-portrait"}[upscaleSize.SelectedIndex];payload["editStrength"]=(double)strength.Value;}}
        string endpoint=editing?"edits":"generations";SetBusy(true);status.Text=background?"Recortando o fundo localmente…":inpaint?"Reconstruindo somente a área marcada…":upscale?"Ampliando a referência sem gerar novos personagens…":"Processando imagem… Aguarde; o resultado anterior continua na prévia.";
        try{var data=await Api("/v1/images/"+endpoint,payload);if(IsDisposed)return;string image=Convert.ToString(data["image"]);byte[] bytes=Convert.FromBase64String(image.Substring(image.IndexOf(',')+1));Directory.CreateDirectory(history);string id=DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff")+"-"+Guid.NewGuid().ToString("N").Substring(0,6);string file=Path.Combine(history,id+".png");File.WriteAllBytes(file,bytes);var metadata=new Dictionary<string,object>{{"prompt",payload["prompt"]},{"size",data["size"]},{"provider",data["provider"]},{"quality",payload["quality"]},{"action",upscale?"upscale":editing?"transform":"generate"}};File.WriteAllText(Path.Combine(history,id+".json"),json.Serialize(metadata),Encoding.UTF8);ShowImage(file);LoadHistory();status.Text="Imagem pronta · "+data["size"]+" · "+data["model"]+". Salva no histórico local.";}
        catch(Exception error){if(!IsDisposed)status.Text=error.Message;}
        finally{if(!IsDisposed)SetBusy(false);else busy=false;}
    }
    void ShowImage(string file,bool remember=true){Bitmap next;using(var stream=File.OpenRead(file))using(var source=Image.FromStream(stream))next=new Bitmap(source);if(remember&&currentFile!=null&&currentFile!=file)previousImages.Push(new KeyValuePair<string,string>(currentFile,currentPrompt));var previous=preview.Image;preview.Image=next;if(previous!=null)previous.Dispose();currentFile=file;try{var metadata=json.Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.ChangeExtension(file,".json")));currentPrompt=Convert.ToString(metadata["prompt"]);}catch{}download.Enabled=reuse.Enabled=true;undo.Enabled=previousImages.Count>0;}
    void LoadHistory(){foreach(Control item in gallery.Controls.Cast<Control>().ToArray()){var old=item as Button;if(old!=null&&old.Image!=null)old.Image.Dispose();item.Dispose();}if(!Directory.Exists(history))return;foreach(string file in Directory.GetFiles(history,"*.json").OrderByDescending(x=>x).Take(40)){try{var meta=json.Deserialize<Dictionary<string,object>>(File.ReadAllText(file));string image=Path.ChangeExtension(file,".png");if(!File.Exists(image))continue;var button=MakeButton(Convert.ToString(meta["prompt"]),220);button.Height=76;button.AutoEllipsis=true;button.TextAlign=ContentAlignment.MiddleLeft;using(var stream=File.OpenRead(image))using(var source=Image.FromStream(stream))button.Image=new Bitmap(source,new Size(60,60));button.Click+=delegate{if(busy)return;try{ShowImage(image);currentPrompt=Convert.ToString(meta["prompt"]);prompt.Text=currentPrompt;status.Text="Criação recuperada do histórico local.";}catch{status.Text="Não foi possível abrir essa criação.";}};gallery.Controls.Add(button);}catch{}}}
    void Download(){if(currentFile==null)return;using(var dialog=new SaveFileDialog {Filter="Imagem PNG|*.png",FileName="PrismaImagem.png",InitialDirectory=history}){if(dialog.ShowDialog(this)!=DialogResult.OK)return;try{if(!string.Equals(Path.GetFullPath(currentFile),Path.GetFullPath(dialog.FileName),StringComparison.OrdinalIgnoreCase))File.Copy(currentFile,dialog.FileName,true);status.Text="Imagem salva.";}catch{status.Text="Não foi possível salvar nesse local.";}}}
}

sealed class StudioButton : Button {
    public StudioButton(){SetStyle(ControlStyles.UserPaint|ControlStyles.AllPaintingInWmPaint|ControlStyles.OptimizedDoubleBuffer,true);}
    protected override void OnPaint(PaintEventArgs e){
        using(var brush=new SolidBrush(Enabled?BackColor:Color.FromArgb(40,34,48)))e.Graphics.FillRectangle(brush,ClientRectangle);
        using(var border=new Pen(Enabled?Color.FromArgb(179,155,207):Color.FromArgb(75,66,88)))e.Graphics.DrawRectangle(border,0,0,Width-1,Height-1);
        var bounds=new Rectangle(10,4,Math.Max(0,Width-20),Math.Max(0,Height-8));
        if(Image!=null){e.Graphics.DrawImage(Image,new Rectangle(6,8,60,60));bounds.X=74;bounds.Width=Math.Max(0,Width-82);}
        TextRenderer.DrawText(e.Graphics,Text,Font,bounds,Enabled?ForeColor:Color.FromArgb(155,143,170),TextFormatFlags.VerticalCenter|TextFormatFlags.EndEllipsis|(TextAlign==ContentAlignment.MiddleLeft?TextFormatFlags.Left:TextFormatFlags.HorizontalCenter));
        if(Focused&&ShowFocusCues)ControlPaint.DrawFocusRectangle(e.Graphics,new Rectangle(3,3,Width-6,Height-6));
    }
}
