"""Telas de autenticação e ferramentas administrativas da edição Local."""
import sqlite3
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from main import ErroCadastro


def autenticar(raiz, banco, usuario_bloqueado=None):
    primeiro = banco.primeiro_acesso
    tela = tk.Toplevel(raiz)
    tela.title("HD Clientes Local • Primeiro acesso" if primeiro else "HD Clientes Local • Entrar")
    tela.geometry("510x470" if primeiro else "510x390")
    tela.resizable(False, False)
    tela.configure(bg="#f3f5f9")
    tela.protocol("WM_DELETE_WINDOW", tela.destroy)
    resultado = {"ok": False}
    painel = ttk.Frame(tela, padding=28)
    painel.pack(fill="both", expand=True)
    ttk.Label(painel, text="HD Clientes • Local", font=("Segoe UI", 21, "bold")).pack(anchor="w")
    texto = "Crie o administrador desta empresa.\nNão existe senha padrão." if primeiro else "Entre para acessar os cadastros."
    ttk.Label(painel, text=texto, wraplength=440).pack(anchor="w", pady=(8, 18))
    valores = {}
    for chave, titulo in [("usuario", "Usuário"), ("senha", "Senha")] + ([("confirmacao", "Confirmar senha")] if primeiro else []):
        ttk.Label(painel, text=titulo).pack(anchor="w")
        valores[chave] = tk.StringVar(value=usuario_bloqueado if chave == "usuario" and usuario_bloqueado else "")
        entrada = ttk.Entry(painel, textvariable=valores[chave], show="" if chave == "usuario" else "•")
        entrada.pack(fill="x", pady=(3, 10))
        if chave == "usuario" and usuario_bloqueado:
            entrada.configure(state="readonly")
        if chave == ("senha" if usuario_bloqueado else "usuario"):
            tela.after(100, entrada.focus_set)
    aviso = ttk.Label(painel, text="Use 12 ou mais caracteres na senha." if primeiro else "", wraplength=440)
    aviso.pack(fill="x", pady=(0, 8))
    def entrar():
        botao.configure(state="disabled")
        try:
            nome, senha = valores["usuario"].get(), valores["senha"].get()
            if primeiro and banco.primeiro_acesso:
                if senha != valores["confirmacao"].get():
                    raise ErroCadastro("As senhas não coincidem.")
                banco.criar_usuario(nome, senha, "administrador")
            banco.entrar(nome, senha)
            resultado["ok"] = True
            tela.destroy()
        except (ErroCadastro, sqlite3.Error) as erro:
            aviso.configure(text=str(erro) if isinstance(erro, ErroCadastro) else "Não foi possível acessar o banco de dados.")
            botao.configure(state="normal")
    botao = ttk.Button(painel, text="Criar administrador e entrar" if primeiro else "Entrar", command=entrar)
    botao.pack(fill="x")
    tela.bind("<Return>", lambda _: entrar())
    tela.grab_set()
    raiz.wait_window(tela)
    return resultado["ok"]


def alterar_senha(raiz, banco, alvo=None):
    tela = tk.Toplevel(raiz)
    tela.title("Redefinir senha do usuário" if alvo else "Alterar minha senha")
    tela.transient(raiz)
    tela.geometry("460x330")
    painel = ttk.Frame(tela, padding=20)
    painel.pack(fill="both", expand=True)
    vars = []
    for titulo in ("Sua senha atual (autorização)", "Nova senha — mínimo de 12 caracteres", "Confirme a nova senha"):
        ttk.Label(painel, text=titulo).pack(anchor="w")
        var = tk.StringVar()
        vars.append(var)
        ttk.Entry(painel, textvariable=var, show="•").pack(fill="x", pady=(3, 10))
    aviso = ttk.Label(painel, wraplength=410)
    aviso.pack(fill="x")
    def salvar():
        try:
            if vars[1].get() != vars[2].get():
                raise ErroCadastro("As novas senhas não coincidem.")
            banco.alterar_senha(vars[0].get(), vars[1].get(), alvo)
            messagebox.showinfo("Senha atualizada", "A nova senha foi salva.", parent=tela)
            tela.destroy()
        except ErroCadastro as erro:
            aviso.configure(text=str(erro))
    ttk.Button(painel, text="Salvar nova senha", command=salvar).pack(fill="x", pady=10)


def usuarios(raiz, banco):
    banco.exigir(admin=True)
    tela = tk.Toplevel(raiz)
    tela.title("Usuários e permissões")
    largura = min(800, tela.winfo_screenwidth() - 80)
    altura = min(760, tela.winfo_screenheight() - 100)
    tela.geometry(f"{largura}x{altura}")
    tela.minsize(560, 440)
    tela.configure(bg="#f3f5f9")
    painel = ttk.Frame(tela, padding=18, style="Card.TFrame")
    painel.pack(fill="both", expand=True)
    painel.columnconfigure(0, weight=1)
    painel.rowconfigure(1, weight=1, minsize=90)
    painel.rowconfigure(4, weight=2, minsize=140)
    ttk.Label(painel, text="Usuários e permissões", style="Card.TLabel", font=("Segoe UI", 17, "bold")).grid(row=0, column=0, sticky="w", pady=(0, 12))
    lista = ttk.Frame(painel, style="Card.TFrame")
    lista.grid(row=1, column=0, sticky="nsew")
    lista.columnconfigure(0, weight=1)
    lista.rowconfigure(0, weight=1)
    tabela = ttk.Treeview(lista, columns=("nome", "perfil", "ativo"), show="headings", height=4, selectmode="browse")
    for chave, titulo in (("nome", "Usuário"), ("perfil", "Perfil"), ("ativo", "Acesso")):
        tabela.heading(chave, text=titulo)
        tabela.column(chave, width=170, minwidth=100)
    tabela.grid(row=0, column=0, sticky="nsew")
    barra_lista = ttk.Scrollbar(lista, command=tabela.yview)
    barra_lista.grid(row=0, column=1, sticky="ns")
    tabela.configure(yscrollcommand=barra_lista.set)
    def atualizar():
        tabela.delete(*tabela.get_children())
        for u in banco.usuarios():
            tabela.insert("", "end", iid=u["id"], values=(u["nome"], u["perfil"], "Ativo" if u["ativo"] else "Desativado"))
    aviso = ttk.Label(painel, wraplength=670, style="Muted.TLabel")
    aviso.grid(row=2, column=0, sticky="ew", pady=8)
    painel.bind("<Configure>", lambda evento: aviso.configure(wraplength=max(300, evento.width - 36)))
    botoes = ttk.Frame(painel, style="Card.TFrame")
    botoes.grid(row=3, column=0, sticky="ew", pady=(0, 12))
    def ativar():
        if not tabela.selection():
            return
        ident = tabela.selection()[0]
        u = next(u for u in banco.usuarios() if u["id"] == ident)
        try:
            banco.ativar_usuario(ident, not u["ativo"])
            atualizar()
        except ErroCadastro as erro:
            aviso.configure(text=str(erro))
    ttk.Button(botoes, text="Ativar / desativar selecionado", command=ativar).pack(side="left")
    ttk.Button(botoes, text="Redefinir senha…", command=lambda: alterar_senha(tela, banco, tabela.selection()[0]) if tabela.selection() else None).pack(side="left", padx=8)
    area_form = ttk.Frame(painel, style="Card.TFrame")
    area_form.grid(row=4, column=0, sticky="nsew")
    area_form.columnconfigure(0, weight=1)
    area_form.rowconfigure(0, weight=1)
    canvas = tk.Canvas(area_form, bg="white", highlightthickness=0, borderwidth=0, height=265)
    canvas.grid(row=0, column=0, sticky="nsew")
    barra_form = ttk.Scrollbar(area_form, command=canvas.yview)
    barra_form.grid(row=0, column=1, sticky="ns")
    canvas.configure(yscrollcommand=barra_form.set)
    form = ttk.Frame(canvas, style="Card.TFrame", padding=(0, 8, 12, 12))
    janela_form = canvas.create_window((0, 0), window=form, anchor="nw")
    form.bind("<Configure>", lambda _: canvas.configure(scrollregion=canvas.bbox("all")))
    canvas.bind("<Configure>", lambda evento: canvas.itemconfigure(janela_form, width=evento.width))
    ttk.Label(form, text="Criar usuário", style="Card.TLabel", font=("Segoe UI", 12, "bold")).grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 8))
    nome, senha, confirmar, perfil = (tk.StringVar() for _ in range(4))
    perfil.set("operador")
    entradas = []
    for linha, (rotulo, var) in enumerate((("Usuário", nome), ("Senha (12+ caracteres)", senha), ("Confirmar senha", confirmar)), 1):
        ttk.Label(form, text=rotulo, style="Card.TLabel").grid(row=linha, column=0, sticky="w", padx=(0, 12), pady=5)
        entrada = ttk.Entry(form, textvariable=var, show="" if linha == 1 else "•")
        entrada.grid(row=linha, column=1, sticky="ew", pady=5)
        entradas.append(entrada)
        def revelar(_, widget=entrada):
            tela.after_idle(lambda: canvas.yview_moveto(max(0, widget.winfo_y() - 30) / max(1, form.winfo_height())))
        entrada.bind("<FocusIn>", revelar)
    form.columnconfigure(1, weight=1)
    ttk.Label(form, text="Perfil", style="Card.TLabel").grid(row=4, column=0, sticky="w", pady=5)
    combo = ttk.Combobox(form, textvariable=perfil, values=("operador", "administrador"), state="readonly")
    combo.grid(row=4, column=1, sticky="ew", pady=5)
    def criar():
        try:
            if senha.get() != confirmar.get():
                raise ErroCadastro("As senhas não coincidem.")
            banco.criar_usuario(nome.get(), senha.get(), perfil.get())
            nome.set(""); senha.set(""); confirmar.set("")
            atualizar()
            aviso.configure(text="Usuário criado. Operadores cadastram e editam; administradores também excluem, exportam, restauram e gerenciam acessos.")
        except ErroCadastro as erro:
            aviso.configure(text=str(erro))
    botao_criar = ttk.Button(form, text="Criar usuário", command=criar, style="Primary.TButton")
    botao_criar.grid(row=5, column=1, sticky="e", pady=(12, 0))
    def rolar(evento):
        canvas.yview_scroll(-int(evento.delta / 120), "units")
        return "break"
    for widget in (canvas, form, combo, botao_criar, *form.winfo_children()):
        widget.bind("<MouseWheel>", rolar)
    tela._form_canvas = canvas
    tela._form_fields = (nome, senha, confirmar, perfil)
    tela._form_submit = botao_criar
    atualizar()
    return tela


def tabela_administrativa(raiz, banco, lixeira=False, apos_recuperar=None):
    banco.exigir(admin=True)
    tela = tk.Toplevel(raiz)
    tela.title("Lixeira de clientes" if lixeira else "Histórico de alterações — últimos 500 eventos")
    tela.geometry("940x500")
    painel = ttk.Frame(tela, padding=16)
    painel.pack(fill="both", expand=True)
    colunas = ("nome", "telefone", "excluido_em") if lixeira else ("data", "usuario", "acao", "entidade", "detalhe")
    tabela = ttk.Treeview(painel, columns=colunas, show="headings")
    for chave in colunas:
        tabela.heading(chave, text=chave.replace("_", " ").capitalize())
        tabela.column(chave, width=170, minwidth=100)
    barra = ttk.Scrollbar(painel, command=tabela.yview)
    barra.pack(side="right", fill="y")
    tabela.configure(yscrollcommand=barra.set)
    tabela.pack(fill="both", expand=True)
    aviso = ttk.Label(painel, wraplength=800)
    aviso.pack(fill="x", pady=8)
    def atualizar():
        tabela.delete(*tabela.get_children())
        for r in banco.lixeira() if lixeira else banco.historico():
            tabela.insert("", "end", iid=r["id"] if lixeira else str(r["seq"]), values=tuple(r[c] for c in colunas))
    if lixeira:
        def recuperar():
            if not tabela.selection():
                return
            try:
                banco.recuperar_cliente(tabela.selection()[0])
                atualizar()
                if apos_recuperar:
                    apos_recuperar()
                aviso.configure(text="Cliente recuperado.")
            except ErroCadastro as erro:
                aviso.configure(text=str(erro))
        ttk.Button(painel, text="Recuperar selecionado", command=recuperar).pack(anchor="e")
    atualizar()


def menu_empresa(app):
    raiz, banco = app.janela, app.cadastro
    menu = tk.Menu(raiz)
    conta = tk.Menu(menu, tearoff=False)
    conta.add_command(label=f"Usuário: {banco.sessao['nome']} ({banco.sessao['perfil']})", state="disabled")
    conta.add_command(label="Alterar minha senha…", command=lambda: alterar_senha(raiz, banco))
    conta.add_command(label="Bloquear sessão", command=app.bloquear_sessao)
    conta.add_command(label="Sair", command=app.fechar)
    menu.add_cascade(label="Minha conta", menu=conta)
    admin = tk.Menu(menu, tearoff=False)
    estado = "normal" if banco.administrador else "disabled"
    def importar():
        caminho = filedialog.askopenfilename(parent=raiz, title="Importar cadastros antigos", filetypes=[("Clientes JSON", "*.json")])
        if not caminho:
            return
        if not app.confirmar_descarte():
            return
        try:
            registros = banco.ler_backup(caminho)
            if not messagebox.askyesno("Importar clientes", f"Adicionar {len(registros)} cliente(s) à lista atual?\n\nSe houver telefone ou e-mail repetido, a importação inteira será cancelada.", parent=raiz):
                return
            total = banco.importar(caminho)
            app.limpar(); app.busca.set(""); app.atualizar_lista()
            app.mensagem(f"Importação concluída: {total} cliente(s). O arquivo original foi preservado.", "sucesso")
        except ErroCadastro as erro:
            app.erro(erro)
    def destino():
        pasta = filedialog.askdirectory(parent=raiz, title="Escolha uma pasta para a segunda cópia do backup (preferencialmente outro disco)")
        if pasta:
            try:
                banco.configurar_backup(pasta)
                app.mensagem("Destino de segunda cópia configurado. Crie um backup para verificar o acesso.")
            except ErroCadastro as erro:
                app.erro(erro)
    admin.add_command(label="Usuários e permissões…", state=estado, command=lambda: usuarios(raiz, banco))
    admin.add_command(label="Histórico de alterações…", state=estado, command=lambda: tabela_administrativa(raiz, banco))
    admin.add_command(label="Lixeira de clientes…", state=estado, command=lambda: tabela_administrativa(raiz, banco, True, app.atualizar_lista))
    admin.add_separator()
    admin.add_command(label="Importar JSON antigo…", state=estado, command=importar)
    admin.add_command(label="Configurar segunda cópia do backup…", state=estado, command=destino)
    def desativar_destino():
        if messagebox.askyesno("Desativar segunda cópia?", "Os backups locais continuarão funcionando, mas as novas cópias deixarão de ser enviadas ao segundo destino. Deseja continuar?", parent=raiz):
            try:
                banco.configurar_backup("")
                app.mensagem("Segunda cópia desativada. Os backups locais continuam ativos.")
            except ErroCadastro as erro:
                app.erro(erro)
    admin.add_command(label="Desativar segunda cópia do backup…", state=estado, command=desativar_destino)
    admin.add_command(label="Abrir pasta dos dados", state=estado, command=lambda: os_abrir(banco.arquivo.parent))
    menu.add_cascade(label="Administração", menu=admin)
    ajuda = tk.Menu(menu, tearoff=False)
    ajuda.add_command(label="Sobre", command=lambda: messagebox.showinfo("HD Clientes Local 3.0.1", "Cadastro local para um computador.\n\nSQLite • Usuários • Histórico • Backups\n\nO login controla as ações no aplicativo. O banco local não é criptografado: proteja a conta do Windows e as cópias de segurança.\n\nVersão Equipe com servidor: não incluída nesta edição.", parent=raiz))
    menu.add_cascade(label="Ajuda", menu=ajuda)
    raiz.configure(menu=menu)


def os_abrir(pasta):
    import os
    try:
        os.startfile(str(pasta))
    except OSError:
        messagebox.showerror("Abrir pasta", "Não foi possível abrir a pasta de dados.")
