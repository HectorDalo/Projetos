"""Interface desktop do cadastro. Execute este arquivo para abrir o aplicativo."""
from __future__ import annotations

import argparse
import csv
import os
import queue
import threading
import time
import sqlite3
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from main import ARQUIVO_CLIENTES, CAMPOS, ESTADOS, Cadastro, ErroCadastro, formatar_telefone, numeros
from cep import consultar_cep

FUNDO = "#f3f5f9"
AZUL = "#244ecb"
TEXTO = "#19283f"
CINZA = "#63738b"


class Aplicativo:
    def __init__(self, janela, cadastro):
        self.janela, self.cadastro = janela, cadastro
        self.editando = None
        self.versao_editando = None
        self.base = {c: "" for c in CAMPOS}
        self.fechado = False
        self.requisicao = 0
        self.respostas = queue.Queue()
        self.ordem = ("nome", False)
        self.variaveis = {c: tk.StringVar() for c in CAMPOS}
        self.campos = {}
        self.busca = tk.StringVar()
        janela.title("HD Clientes • Local 3.0.1")
        largura = min(1280, janela.winfo_screenwidth() - 80)
        altura = min(830, janela.winfo_screenheight() - 110)
        janela.geometry(f"{largura}x{altura}+30+30")
        janela.minsize(1000, 650)
        janela.configure(bg=FUNDO)
        janela.protocol("WM_DELETE_WINDOW", self.fechar)
        self.estilos()
        self.construir()
        self.busca.trace_add("write", lambda *_: self.atualizar_lista())
        janela.bind("<Control-s>", lambda _: self.salvar())
        janela.bind("<Control-n>", lambda _: self.novo())
        janela.bind("<Control-f>", lambda _: self.busca_entry.focus_set())
        janela.bind("<Escape>", lambda _: self.novo())
        self.atualizar_lista()
        self.mensagem("Tudo pronto. Cadastre um cliente ou selecione um registro para editar.")
        janela.after(100, self.processar_respostas)
        self.campos["nome"].focus_set()
        if hasattr(cadastro, "sessao"):
            self.janela.report_callback_exception = self.relatar_falha
            from acesso import menu_empresa
            menu_empresa(self)
            self.ultima_atividade = time.monotonic()
            janela.bind_all("<KeyPress>", self.atividade, add="+")
            janela.bind_all("<ButtonPress>", self.atividade, add="+")
            janela.after(15000, self.verificar_inatividade)

    def estilos(self):
        estilo = ttk.Style(self.janela)
        estilo.theme_use("clam")
        estilo.configure("TFrame", background=FUNDO)
        estilo.configure("Card.TFrame", background="white")
        estilo.configure("TLabel", background=FUNDO, foreground=TEXTO, font=("Segoe UI", 10))
        estilo.configure("Card.TLabel", background="white", foreground=TEXTO)
        estilo.configure("Muted.TLabel", background="white", foreground=CINZA, font=("Segoe UI", 9))
        estilo.configure("TEntry", padding=7, fieldbackground="white", bordercolor="#d7deea", font=("Segoe UI", 10))
        estilo.map("TEntry", bordercolor=[("focus", AZUL), ("invalid", "#cf344a")])
        estilo.configure("TCombobox", padding=6, fieldbackground="white", background="#eef2f9", bordercolor="#d7deea", arrowcolor=TEXTO)
        estilo.map("TCombobox", fieldbackground=[("readonly", "white")], foreground=[("readonly", TEXTO)])
        estilo.configure("TLabelframe", background=FUNDO, bordercolor="#d7deea")
        estilo.configure("TLabelframe.Label", background=FUNDO, foreground=TEXTO, font=("Segoe UI", 10, "bold"))
        estilo.configure("TButton", padding=(12, 9), font=("Segoe UI", 9), background="#e9eef8", foreground=TEXTO, borderwidth=0)
        estilo.map("TButton", background=[("active", "#dae4f7")])
        estilo.configure("Primary.TButton", background=AZUL, foreground="white", font=("Segoe UI", 10, "bold"))
        estilo.map("Primary.TButton", background=[("active", "#193ca6"), ("disabled", "#acb9df")], foreground=[("disabled", "#ffffff")])
        estilo.configure("Danger.TButton", foreground="#a8243a", background="#fbeef0")
        estilo.configure("Treeview", rowheight=34, font=("Segoe UI", 10), background="white", fieldbackground="white", foreground=TEXTO, borderwidth=0)
        estilo.configure("Treeview.Heading", font=("Segoe UI", 9, "bold"), background="#eaf0f9", foreground=CINZA, padding=10)
        estilo.map("Treeview", background=[("selected", "#dfe9ff")], foreground=[("selected", "#183a91")])

    def construir(self):
        topo = tk.Frame(self.janela, bg="#162941", padx=24, pady=16)
        topo.pack(fill="x")
        tk.Label(topo, text="HD  /  CLIENTES", bg="#162941", fg="#a8bdf3", font=("Segoe UI", 9, "bold")).pack(anchor="w")
        tk.Label(topo, text="Gestão de clientes", bg="#162941", fg="white", font=("Segoe UI", 23, "bold")).pack(anchor="w", pady=(3, 0))
        tk.Label(topo, text="Contatos organizados. Informações sempre à mão.", bg="#162941", fg="#bccbdf", font=("Segoe UI", 10)).pack(anchor="w")
        corpo = ttk.Frame(self.janela, padding=(20, 16))
        corpo.pack(fill="both", expand=True)
        corpo.columnconfigure(0, weight=0, minsize=416)
        corpo.columnconfigure(1, weight=1)
        corpo.rowconfigure(0, weight=1)

        painel_form = ttk.Frame(corpo, style="Card.TFrame")
        painel_form.grid(row=0, column=0, sticky="nsew", padx=(0, 16))
        painel_form.columnconfigure(0, weight=1)
        painel_form.rowconfigure(0, weight=1)
        self.canvas_form = tk.Canvas(painel_form, bg="white", highlightthickness=0, width=400)
        self.canvas_form.grid(row=0, column=0, sticky="nsew")
        rolagem_form = ttk.Scrollbar(painel_form, command=self.canvas_form.yview)
        rolagem_form.grid(row=0, column=1, sticky="ns")
        self.canvas_form.configure(yscrollcommand=rolagem_form.set)
        formulario = ttk.Frame(self.canvas_form, style="Card.TFrame", padding=18)
        janela_form = self.canvas_form.create_window((0, 0), window=formulario, anchor="nw")
        formulario.bind("<Configure>", lambda _: self.canvas_form.configure(scrollregion=self.canvas_form.bbox("all")))
        self.canvas_form.bind("<Configure>", lambda evento: self.canvas_form.itemconfigure(janela_form, width=evento.width))
        formulario.columnconfigure(1, weight=1)
        self.titulo_form = ttk.Label(formulario, text="Novo cliente", style="Card.TLabel", font=("Segoe UI", 16, "bold"))
        self.titulo_form.grid(row=0, column=0, columnspan=2, sticky="w")
        ttk.Label(formulario, text="* Obrigatório · demais campos são opcionais", style="Muted.TLabel").grid(row=1, column=0, columnspan=2, sticky="w", pady=(5, 12))
        rotulos = [("nome", "Nome completo *"), ("telefone", "Telefone / DDD *"), ("email", "E-mail"), ("cep", "CEP"), ("logradouro", "Rua / avenida"), ("numero", "Número"), ("complemento", "Complemento"), ("bairro", "Bairro"), ("cidade", "Cidade"), ("uf", "Estado / UF"), ("observacoes", "Observações")]
        for linha, (campo, rotulo) in enumerate(rotulos, 2):
            ttk.Label(formulario, text=rotulo, style="Card.TLabel").grid(row=linha, column=0, sticky="w", padx=(0, 12), pady=4)
            pai = formulario
            if campo == "cep":
                pai = ttk.Frame(formulario, style="Card.TFrame")
                pai.grid(row=linha, column=1, sticky="ew")
                pai.columnconfigure(0, weight=1)
            entrada = ttk.Combobox(pai, textvariable=self.variaveis[campo], values=("", *ESTADOS), state="readonly", width=7) if campo == "uf" else ttk.Entry(pai, textvariable=self.variaveis[campo], width=25)
            entrada.grid(row=0 if campo == "cep" else linha, column=0 if campo == "cep" else 1, sticky="ew", pady=4)
            self.campos[campo] = entrada
            if campo == "cep":
                self.botao_cep = ttk.Button(pai, text="Buscar", command=self.buscar_cep, width=7)
                self.botao_cep.grid(row=0, column=1, padx=(6, 0))
            entrada.bind("<FocusIn>", lambda _, e=entrada: e.state(["!invalid"]))
        self.campos["telefone"].bind("<FocusOut>", self.formatar_telefone)
        self.campos["cep"].bind("<FocusOut>", self.formatar_cep)
        self.campos["cep"].bind("<Return>", lambda _: self.buscar_cep())
        ttk.Label(formulario, text="Buscar CEP consulta o ViaCEP. O preenchimento\nmanual funciona mesmo sem internet.", style="Muted.TLabel").grid(row=13, column=0, columnspan=2, sticky="w", pady=(5, 9))
        acoes = ttk.Frame(formulario, style="Card.TFrame")
        acoes.grid(row=14, column=0, columnspan=2, sticky="ew")
        acoes.columnconfigure(0, weight=1)
        acoes.columnconfigure(1, weight=1)
        self.botao_salvar = ttk.Button(acoes, text="Cadastrar cliente", command=self.salvar, style="Primary.TButton")
        self.botao_salvar.grid(row=0, column=0, sticky="ew", padx=(0, 5))
        ttk.Button(acoes, text="Novo / limpar", command=self.novo).grid(row=0, column=1, sticky="ew", padx=(5, 0))
        def permitir_rolagem(widget):
            widget.bind("<MouseWheel>", lambda evento: self.canvas_form.yview_scroll(-int(evento.delta / 120), "units"), add="+")
            for filho in widget.winfo_children():
                permitir_rolagem(filho)
        permitir_rolagem(formulario)

        lista = ttk.Frame(corpo, style="Card.TFrame", padding=18)
        lista.grid(row=0, column=1, sticky="nsew")
        lista.columnconfigure(0, weight=1)
        lista.rowconfigure(3, weight=1)
        faixa = ttk.Frame(lista, style="Card.TFrame")
        faixa.grid(row=0, column=0, sticky="ew")
        cabecalho_lista = ttk.Frame(faixa, style="Card.TFrame")
        cabecalho_lista.pack(fill="x")
        ttk.Label(cabecalho_lista, text="Seus clientes", style="Card.TLabel", font=("Segoe UI", 16, "bold")).pack(side="left")
        self.contagem = ttk.Label(cabecalho_lista, style="Muted.TLabel")
        self.contagem.pack(side="right")
        acoes_backup = ttk.Frame(faixa, style="Card.TFrame")
        acoes_backup.pack(fill="x", pady=(10, 0))
        permitido = not hasattr(self.cadastro, "administrador") or self.cadastro.administrador
        ttk.Button(acoes_backup, text="Criar backup", command=self.criar_backup, state="normal" if permitido else "disabled").pack(side="left")
        ttk.Button(acoes_backup, text="Abrir pasta", command=self.abrir_backups, state="normal" if permitido else "disabled").pack(side="left", padx=6)
        ttk.Button(acoes_backup, text="Restaurar clientes…", command=self.restaurar_backup, state="normal" if permitido else "disabled").pack(side="left")
        ttk.Label(lista, text="Pesquise por nome, telefone, e-mail ou endereço", style="Muted.TLabel").grid(row=1, column=0, sticky="w", pady=(13, 4))
        pesquisa = ttk.Frame(lista, style="Card.TFrame")
        pesquisa.grid(row=2, column=0, sticky="ew", pady=(0, 12))
        pesquisa.columnconfigure(0, weight=1)
        self.busca_entry = ttk.Entry(pesquisa, textvariable=self.busca)
        self.busca_entry.grid(row=0, column=0, sticky="ew")
        ttk.Button(pesquisa, text="Limpar", command=lambda: self.busca.set("")).grid(row=0, column=1, padx=(8, 0))
        area_tabela = ttk.Frame(lista, style="Card.TFrame")
        area_tabela.grid(row=3, column=0, sticky="nsew")
        area_tabela.columnconfigure(0, weight=1)
        area_tabela.rowconfigure(0, weight=1)
        colunas = ("nome", "telefone", "email", "cidade")
        self.tabela = ttk.Treeview(area_tabela, columns=colunas, show="headings", selectmode="browse")
        for campo, titulo, largura in (("nome", "Nome", 175), ("telefone", "Telefone", 140), ("email", "E-mail", 190), ("cidade", "Cidade", 120)):
            self.tabela.heading(campo, text=titulo, command=lambda c=campo: self.ordenar(c))
            self.tabela.column(campo, width=largura, minwidth=100, anchor="w")
        self.tabela.grid(row=0, column=0, sticky="nsew")
        vertical = ttk.Scrollbar(area_tabela, command=self.tabela.yview)
        vertical.grid(row=0, column=1, sticky="ns")
        horizontal = ttk.Scrollbar(area_tabela, orient="horizontal", command=self.tabela.xview)
        horizontal.grid(row=1, column=0, sticky="ew")
        self.tabela.configure(yscrollcommand=vertical.set, xscrollcommand=horizontal.set)
        self.tabela.tag_configure("alternada", background="#f7f9fd")
        self.tabela.bind("<<TreeviewSelect>>", self.selecionar)
        self.tabela.bind("<Double-1>", lambda _: self.editar())
        self.tabela.bind("<Return>", lambda _: self.editar())
        self.detalhes = ttk.Label(lista, text="Selecione um cliente para ver o endereço.", style="Muted.TLabel", wraplength=480)
        self.detalhes.grid(row=4, column=0, sticky="ew", pady=(12, 8))
        botoes = ttk.Frame(lista, style="Card.TFrame")
        botoes.grid(row=5, column=0, sticky="ew")
        self.botao_editar = ttk.Button(botoes, text="Editar selecionado", command=self.editar, state="disabled")
        self.botao_editar.pack(side="left")
        self.botao_excluir = ttk.Button(botoes, text="Excluir", command=self.excluir, style="Danger.TButton", state="disabled")
        self.botao_excluir.pack(side="left", padx=8)
        ttk.Button(botoes, text="Exportar CSV", command=self.exportar).pack(side="right")
        self.aviso = tk.Label(self.janela, anchor="w", justify="left", font=("Segoe UI", 10), padx=20, pady=10, wraplength=950)
        self.aviso.pack(fill="x")
        tk.Label(self.janela, text="Ctrl+N Novo   ·   Ctrl+S Salvar   ·   Ctrl+F Pesquisar   |   Dados locais com cópia de segurança a cada alteração", bg=FUNDO, fg=CINZA, font=("Segoe UI", 9), pady=7).pack(fill="x")

    def dados(self):
        return {c: v.get() for c, v in self.variaveis.items()}

    def mensagem(self, texto, tipo="info"):
        cores = {"info": ("#e9effb", "#24477c"), "sucesso": ("#e2f3eb", "#176442"), "erro": ("#fce9ec", "#a3213c")}
        fundo, cor = cores[tipo]
        self.aviso.configure(text=texto, bg=fundo, fg=cor)

    def erro(self, erro):
        self.mensagem(str(erro), "erro")
        if getattr(erro, "campo", None) in self.campos:
            entrada = self.campos[erro.campo]
            entrada.state(["invalid"])
            entrada.focus_set()

    def confirmar_descarte(self):
        if self.dados() == self.base:
            return True
        return messagebox.askyesno("Descartar alterações?", "Há informações não salvas no formulário. Deseja descartá-las e continuar?", parent=self.janela)

    def limpar(self):
        self.requisicao += 1
        self.botao_cep.configure(state="normal", text="Buscar")
        self.editando = None
        self.versao_editando = None
        for campo, var in self.variaveis.items():
            var.set("")
            self.campos[campo].state(["!invalid"])
        self.base = self.dados()
        self.titulo_form.configure(text="Novo cliente")
        self.botao_salvar.configure(text="Cadastrar cliente")

    def novo(self):
        if not self.confirmar_descarte():
            return
        self.limpar()
        self.tabela.selection_remove(*self.tabela.selection())
        self.mensagem("Novo cadastro. Preencha o nome e o telefone; acrescente os dados de contato e endereço.")
        self.campos["nome"].focus_set()

    def formatar_telefone(self, _=None):
        self.variaveis["telefone"].set(formatar_telefone(self.variaveis["telefone"].get()))

    def formatar_cep(self, _=None):
        texto = self.variaveis["cep"].get().strip()
        if len(numeros(texto)) == 8 and all(c in "0123456789-" for c in texto):
            valor = numeros(texto)
            self.variaveis["cep"].set(f"{valor[:5]}-{valor[5:]}")

    def salvar(self):
        editando = self.editando is not None
        try:
            dados = self.dados()
            if self.versao_editando is not None:
                dados["_versao"] = self.versao_editando
            registro = self.cadastro.salvar(dados, self.editando)
        except ErroCadastro as erro:
            self.erro(erro)
            return
        self.limpar()
        # Mantém a pesquisa, mas revela o registro recém-salvo se ele não corresponder.
        if not any(c["id"] == registro["id"] for c in self.cadastro.pesquisar(self.busca.get())):
            self.busca.set("")
        self.atualizar_lista(registro["id"])
        acao = "atualizado" if editando else "cadastrado"
        self.mensagem(f"Cliente {registro['nome']} {acao} com sucesso. Os dados foram salvos.", "sucesso")

    def atualizar_lista(self, selecionar=None):
        selecao = selecionar or (self.tabela.selection()[0] if self.tabela.selection() else None)
        self.tabela.delete(*self.tabela.get_children())
        campo, reverso = self.ordem
        clientes = sorted(self.cadastro.pesquisar(self.busca.get()), key=lambda c: c[campo].casefold(), reverse=reverso)
        for indice, c in enumerate(clientes):
            self.tabela.insert("", "end", iid=c["id"], values=(c["nome"], formatar_telefone(c["telefone"]), c["email"], c["cidade"]), tags=("alternada",) if indice % 2 else ())
        total = len(self.cadastro.clientes)
        self.contagem.configure(text=f"{len(clientes)} de {total} cliente(s)")
        if selecao and self.tabela.exists(selecao):
            self.tabela.selection_set(selecao)
            self.tabela.see(selecao)
        self.selecionar()

    def ordenar(self, campo):
        self.ordem = (campo, not self.ordem[1] if self.ordem[0] == campo else False)
        for c in self.tabela["columns"]:
            titulo = {"nome": "Nome", "telefone": "Telefone", "email": "E-mail", "cidade": "Cidade"}[c]
            self.tabela.heading(c, text=titulo + ((" ↓" if self.ordem[1] else " ↑") if c == campo else ""))
        self.atualizar_lista()

    def selecionado(self):
        selecao = self.tabela.selection()
        return self.cadastro.obter(selecao[0]) if selecao else None

    def selecionar(self, _=None):
        cliente = self.selecionado()
        for botao in (self.botao_editar, self.botao_excluir):
            botao.configure(state="normal" if cliente else "disabled")
        if hasattr(self.cadastro, "administrador") and not self.cadastro.administrador:
            self.botao_excluir.configure(state="disabled")
        if not cliente:
            self.detalhes.configure(text="Nenhum resultado para esta busca." if self.busca.get() else "Selecione um cliente para ver o endereço.")
            return
        endereco = ", ".join(cliente[c] for c in ("logradouro", "numero", "complemento", "bairro") if cliente[c])
        cidade = " / ".join(cliente[c] for c in ("cidade", "uf") if cliente[c])
        self.detalhes.configure(text=" · ".join(v for v in (endereco, cidade, cliente["cep"]) if v) or "Endereço ainda não informado. Clique em Editar para completar.")

    def editar(self):
        cliente = self.selecionado()
        if not cliente or not self.confirmar_descarte():
            return
        self.limpar()
        self.editando = cliente["id"]
        self.versao_editando = cliente.get("_versao")
        for campo in CAMPOS:
            self.variaveis[campo].set(cliente[campo])
        self.base = self.dados()
        self.titulo_form.configure(text="Editar cliente")
        self.botao_salvar.configure(text="Salvar alterações")
        self.mensagem(f"Editando {cliente['nome']}. Altere os dados e clique em Salvar alterações.")
        self.campos["nome"].focus_set()

    def excluir(self):
        cliente = self.selecionado()
        if not cliente:
            return
        if self.editando == cliente["id"] and not self.confirmar_descarte():
            return
        if not messagebox.askyesno("Excluir cliente?", f"Deseja excluir o cadastro de {cliente['nome']}?\n\nNa edição Local, o registro ficará na lixeira para recuperação pelo administrador.", icon="warning", parent=self.janela):
            return
        try:
            self.cadastro.excluir(cliente["id"])
        except ErroCadastro as erro:
            self.erro(erro)
            return
        if self.editando == cliente["id"]:
            self.limpar()
        self.atualizar_lista()
        self.mensagem(f"O cadastro de {cliente['nome']} foi excluído. Na edição Local, recupere em Administração → Lixeira de clientes.", "sucesso")

    def buscar_cep(self):
        cep = self.variaveis["cep"].get().strip()
        if len(numeros(cep)) != 8 or any(c not in "0123456789-" for c in cep):
            self.erro(ErroCadastro("Informe um CEP com 8 dígitos antes de buscar.", "cep"))
            return
        self.requisicao += 1
        pedido = self.requisicao
        original = self.dados()
        self.botao_cep.configure(state="disabled", text="…")
        self.mensagem("Consultando o CEP. Você pode continuar preenchendo o formulário.")
        def tarefa():
            try:
                resultado = consultar_cep(cep)
            except ErroCadastro as erro:
                resultado = erro
            self.respostas.put((pedido, cep, original, resultado))
        threading.Thread(target=tarefa, daemon=True).start()

    def processar_respostas(self):
        if self.fechado:
            return
        try:
            while True:
                pedido, cep, original, resultado = self.respostas.get_nowait()
                if pedido != self.requisicao:
                    continue
                self.botao_cep.configure(state="normal", text="Buscar")
                if numeros(cep) != numeros(self.variaveis["cep"].get()):
                    self.mensagem("O CEP foi alterado. Clique em Buscar para consultar o novo número.")
                elif isinstance(resultado, ErroCadastro):
                    self.erro(resultado)
                else:
                    for campo, valor in resultado.items():
                        if self.variaveis[campo].get() == original[campo] and valor:
                            self.variaveis[campo].set(valor)
                    self.mensagem("CEP consultado. Confira o endereço e informe o número e o complemento, se necessário.", "sucesso")
        except queue.Empty:
            pass
        self.janela.after(100, self.processar_respostas)

    def exportar(self):
        if hasattr(self.cadastro, "exigir"):
            try:
                self.cadastro.exigir(admin=True)
            except ErroCadastro as erro:
                self.erro(erro)
                return
        clientes = self.cadastro.pesquisar(self.busca.get())
        if not clientes:
            self.mensagem("Não há clientes nesta seleção para exportar.")
            return
        caminho = filedialog.asksaveasfilename(parent=self.janela, title="Exportar clientes visíveis", defaultextension=".csv", initialfile="clientes-exportados.csv", filetypes=[("Planilha CSV", "*.csv")])
        if not caminho:
            return
        # Não permita que a exportação sobrescreva a base ou os arquivos do app.
        from pathlib import Path
        destino = Path(caminho).resolve()
        if destino.suffix.lower() != ".csv" or destino == self.cadastro.arquivo.resolve():
            self.mensagem("Escolha um arquivo com extensão .csv para exportar os clientes.", "erro")
            return
        def seguro(valor):
            return "'" + valor if valor.lstrip().startswith(("=", "+", "-", "@")) else valor
        try:
            with destino.open("w", encoding="utf-8-sig", newline="") as arquivo:
                escritor = csv.writer(arquivo, delimiter=";")
                escritor.writerow(CAMPOS)
                for cliente in clientes:
                    escritor.writerow(seguro(cliente[c]) for c in CAMPOS)
            if hasattr(self.cadastro, "registrar_exportacao"):
                self.cadastro.registrar_exportacao(len(clientes))
            self.mensagem(f"Exportação concluída: {len(clientes)} cliente(s).", "sucesso")
        except OSError:
            self.mensagem("Não foi possível exportar. Feche o arquivo caso esteja aberto e confira a pasta escolhida.", "erro")
        except ErroCadastro as erro:
            self.erro(erro)

    def criar_backup(self):
        try:
            caminho = self.cadastro.criar_backup()
        except ErroCadastro as erro:
            self.erro(erro)
            return
        self.mensagem(f"Backup criado: {caminho.name}. Inclui todos os clientes salvos; alterações não salvas do formulário não são incluídas.", "sucesso")

    def abrir_backups(self):
        if hasattr(self.cadastro, "exigir"):
            try:
                self.cadastro.exigir(admin=True)
            except ErroCadastro as erro:
                self.erro(erro)
                return
        pasta = self.cadastro.arquivo.parent / "backups"
        try:
            pasta.mkdir(exist_ok=True)
            os.startfile(str(pasta.resolve()))
        except OSError:
            self.mensagem("Não foi possível abrir a pasta backups. Confira o acesso à pasta do aplicativo.", "erro")

    def restaurar_backup(self):
        if hasattr(self.cadastro, "exigir"):
            try:
                self.cadastro.exigir(admin=True)
            except ErroCadastro as erro:
                self.erro(erro)
                return
        from pathlib import Path
        pasta = self.cadastro.arquivo.parent / "backups"
        caminho = filedialog.askopenfilename(parent=self.janela, title="Escolha um backup para restaurar os clientes", initialdir=str(pasta if pasta.exists() else self.cadastro.arquivo.parent), filetypes=[("Backup de clientes", "*.sqlite3 *.json *.db")])
        if not caminho:
            return
        if Path(caminho).resolve() == self.cadastro.arquivo.resolve() or not Path(caminho).is_file():
            self.mensagem("Escolha uma cópia existente da pasta backups, diferente do arquivo atual de clientes.", "erro")
            return
        try:
            previa = self.cadastro.ler_backup(caminho) if hasattr(self.cadastro, "ler_backup") else Cadastro(caminho).clientes
        except ErroCadastro:
            self.mensagem("O arquivo escolhido não é um backup de clientes válido. Os dados atuais foram mantidos.", "erro")
            return
        alteracoes = "\n\nAs alterações não salvas do formulário serão descartadas." if self.dados() != self.base else ""
        aviso = (f"Restaurar {Path(caminho).name}?\n\n"
                 f"A lista atual de {len(self.cadastro.clientes)} cliente(s) será substituída pelos {len(previa)} cliente(s) deste backup. Os registros não serão somados. Usuários e histórico atuais serão mantidos.\n\n"
                 "Antes da troca, os dados atuais salvos serão guardados em outra cópia de segurança." + alteracoes)
        if not messagebox.askyesno("Confirmar restauração", aviso, icon="warning", parent=self.janela):
            return
        try:
            total = self.cadastro.restaurar_backup(caminho)
        except ErroCadastro as erro:
            self.erro(erro)
            return
        self.limpar()
        self.busca.set("")
        self.atualizar_lista()
        self.mensagem(f"Backup restaurado com sucesso: {total} cliente(s). A lista anterior foi preservada se já existia um arquivo de dados.", "sucesso")

    def fechar(self):
        if self.confirmar_descarte():
            if hasattr(self.cadastro, "sair"):
                try:
                    self.cadastro.sair()
                except ErroCadastro:
                    pass
            self.fechado = True
            self.requisicao += 1
            self.janela.destroy()

    def atividade(self, _=None):
        self.ultima_atividade = time.monotonic()

    def relatar_falha(self, tipo, valor, trilha):
        import logging
        from logging.handlers import RotatingFileHandler
        try:
            logger = logging.getLogger("hdclientes")
            if not logger.handlers:
                handler = RotatingFileHandler(self.cadastro.arquivo.parent / "aplicativo.log", maxBytes=1_000_000, backupCount=3, encoding="utf-8")
                handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
                logger.addHandler(handler)
            logger.error("Falha em operação da interface", exc_info=(tipo, valor, trilha))
        except OSError:
            pass
        self.mensagem("A operação não foi concluída. Confira os dados; se o problema continuar, consulte o suporte com o arquivo aplicativo.log.", "erro")

    def verificar_inatividade(self):
        if self.fechado:
            return
        if time.monotonic() - self.ultima_atividade >= 900:
            self.bloquear_sessao()
        if not self.fechado:
            self.janela.after(15000, self.verificar_inatividade)

    def bloquear_sessao(self):
        from acesso import autenticar
        nome = self.cadastro.sessao["nome"]
        # Fecha telas administrativas para não deixá-las visíveis no bloqueio.
        for filho in self.janela.winfo_children():
            if isinstance(filho, tk.Toplevel):
                filho.destroy()
        self.janela.withdraw()
        self.cadastro.sair()
        if autenticar(self.janela, self.cadastro, usuario_bloqueado=nome):
            self.ultima_atividade = time.monotonic()
            self.janela.deiconify()
            self.mensagem("Sessão desbloqueada. O formulário não salvo foi mantido.")
        else:
            self.fechado = True
            self.janela.destroy()


def executar():
    argumentos = argparse.ArgumentParser(description="Cadastro de clientes")
    argumentos.add_argument("--dados", default=None, help="Caminho alternativo para o banco SQLite local")
    argumentos.add_argument("--diagnostico", metavar="ARQUIVO", help="Verifica o executável com dados fictícios isolados e grava o resultado")
    opcoes = argumentos.parse_args()
    if opcoes.diagnostico:
        from diagnostico import executar_diagnostico
        executar_diagnostico(opcoes.diagnostico)
        return
    from banco import CadastroLocal
    from acesso import autenticar
    from runtime import bloquear_instancia, liberar_instancia
    janela = tk.Tk()
    janela.withdraw()
    ttk.Style(janela).theme_use("clam")
    cadastro = None
    try:
        cadastro = CadastroLocal(opcoes.dados)
        if not bloquear_instancia(cadastro.arquivo):
            raise ErroCadastro("Este banco já está aberto neste computador. Use a janela existente ou feche-a antes de abrir outra.")
        if not autenticar(janela, cadastro):
            janela.destroy()
            return
        Aplicativo(janela, cadastro)
        janela.deiconify()
        janela.mainloop()
    except (ErroCadastro, OSError, sqlite3.Error) as erro:
        messagebox.showerror("Não foi possível abrir o cadastro", str(erro), parent=janela)
        janela.destroy()
    finally:
        if cadastro:
            cadastro.fechar()
        liberar_instancia()


if __name__ == "__main__":
    executar()
