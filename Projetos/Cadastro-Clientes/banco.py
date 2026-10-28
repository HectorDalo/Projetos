"""Serviço da edição Local: transações, identidade, permissões e backups SQLite."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import sqlite3
import time
import uuid
from contextlib import closing, contextmanager
from datetime import datetime
from pathlib import Path

from main import CAMPOS, Cadastro as ArquivoLegado, ErroCadastro, normalizar, numeros, validar

PRODUTO = "HDClientes.Local.3"
ITERACOES = 600_000


def agora():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def pasta_dados():
    return Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "HDClientes" / "Local"


def senha_hash(senha, sal):
    return hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), bytes.fromhex(sal), ITERACOES).hex()


def validar_senha(senha):
    if len(senha) < 12 or len(senha) > 128 or not senha.strip():
        raise ErroCadastro("Use uma senha de 12 a 128 caracteres. Uma frase com várias palavras é uma boa opção.")


class CadastroLocal:
    def __init__(self, arquivo=None):
        self.arquivo = Path(arquivo) if arquivo else pasta_dados() / "clientes.sqlite3"
        if self.arquivo.suffix.lower() not in (".sqlite3", ".db"):
            raise ErroCadastro("O banco deve ser um arquivo .sqlite3 ou .db. Use Importar JSON para trazer os cadastros antigos.")
        self.arquivo.parent.mkdir(parents=True, exist_ok=True)
        self.sessao = None
        self._credencial = None
        self.db = sqlite3.connect(self.arquivo, timeout=8, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA busy_timeout=8000")
        if self.db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
            self.db.close()
            raise ErroCadastro("O banco de dados precisa de recuperação. O arquivo foi preservado.")
        versao = self.db.execute("PRAGMA user_version").fetchone()[0]
        if versao not in (0, 3):
            self.db.close()
            raise ErroCadastro("Este banco exige outra versão do aplicativo. Não foi alterado.")
        tabelas = {r[0] for r in self.db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
        if tabelas:
            try:
                marca = self.db.execute("SELECT valor FROM config WHERE chave='produto'").fetchone()
            except sqlite3.Error:
                marca = None
            if not marca or marca[0] != PRODUTO:
                self.db.close()
                raise ErroCadastro("Este banco não pertence ao HD Clientes. Não foi alterado.")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.executescript("""
        BEGIN IMMEDIATE;
        CREATE TABLE IF NOT EXISTS config(chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS usuarios(
          id TEXT PRIMARY KEY, nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
          sal TEXT NOT NULL, hash TEXT NOT NULL,
          perfil TEXT NOT NULL CHECK(perfil IN ('administrador','operador')),
          ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1)),
          falhas INTEGER NOT NULL DEFAULT 0, bloqueado_ate REAL NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS clientes(
          id TEXT PRIMARY KEY, dados TEXT NOT NULL, telefone TEXT NOT NULL,
          email TEXT NOT NULL DEFAULT '', versao INTEGER NOT NULL DEFAULT 1,
          excluido_em TEXT);
        CREATE UNIQUE INDEX IF NOT EXISTS telefone_unico ON clientes(telefone) WHERE excluido_em IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS email_unico ON clientes(email) WHERE email<>'' AND excluido_em IS NULL;
        CREATE TABLE IF NOT EXISTS eventos(
          seq INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL,
          usuario TEXT NOT NULL, acao TEXT NOT NULL, entidade TEXT NOT NULL DEFAULT '', detalhe TEXT NOT NULL DEFAULT '');
        INSERT OR IGNORE INTO config VALUES('produto','HDClientes.Local.3');
        PRAGMA user_version=3;
        COMMIT;
        """)
        if self.db.execute("SELECT valor FROM config WHERE chave='produto'").fetchone()[0] != PRODUTO:
            self.db.close()
            raise ErroCadastro("O arquivo não pertence a este aplicativo.")

    def fechar(self):
        self.sessao = None
        self.db.close()

    @property
    def primeiro_acesso(self):
        return not self.db.execute("SELECT 1 FROM usuarios LIMIT 1").fetchone()

    @contextmanager
    def transacao(self):
        try:
            self.db.execute("BEGIN IMMEDIATE")
            yield
            self.db.execute("COMMIT")
        except sqlite3.IntegrityError as erro:
            if self.db.in_transaction:
                self.db.execute("ROLLBACK")
            raise ErroCadastro("Já existe um cadastro com esse telefone, e-mail ou usuário. Confira os dados.") from erro
        except sqlite3.Error as erro:
            if self.db.in_transaction:
                self.db.execute("ROLLBACK")
            raise ErroCadastro("Não foi possível concluir a operação. Confira o acesso ao disco e tente novamente. Nenhuma alteração parcial foi salva.") from erro
        except BaseException:
            if self.db.in_transaction:
                self.db.execute("ROLLBACK")
            raise

    def _evento(self, acao, entidade="", detalhe="", usuario=None):
        autor = usuario if usuario is not None else (self.sessao["nome"] if self.sessao else "sistema")
        self.db.execute("INSERT INTO eventos(data,usuario,acao,entidade,detalhe) VALUES(?,?,?,?,?)", (agora(), autor, acao, entidade, detalhe))

    def exigir(self, admin=False):
        if not self.sessao:
            raise ErroCadastro("Entre com seu usuário para continuar.")
        usuario = self.db.execute("SELECT * FROM usuarios WHERE id=? AND ativo=1", (self.sessao["id"],)).fetchone()
        if not usuario:
            self.sessao = None
            raise ErroCadastro("Seu acesso foi desativado. Entre em contato com o administrador.")
        if self._credencial != usuario["hash"]:
            self.sessao = None
            raise ErroCadastro("Sua senha foi redefinida. Feche e abra o aplicativo para entrar novamente.")
        if admin and usuario["perfil"] != "administrador":
            raise ErroCadastro("Esta operação é exclusiva do administrador.")
        return dict(usuario)

    @property
    def administrador(self):
        return self.exigir()["perfil"] == "administrador"

    def criar_usuario(self, nome, senha, perfil="operador"):
        nome = nome.strip()
        if not re.fullmatch(r"[A-Za-z0-9_.-]{3,40}", nome):
            raise ErroCadastro("O usuário deve ter 3 a 40 caracteres: letras sem acentos, números, ponto, hífen ou sublinhado.")
        validar_senha(senha)
        if perfil not in ("administrador", "operador"):
            raise ErroCadastro("Perfil de acesso inválido.")
        with self.transacao():
            if self.primeiro_acesso:
                if perfil != "administrador":
                    raise ErroCadastro("O primeiro usuário deve ser administrador.")
            else:
                self.exigir(admin=True)
            sal = secrets.token_hex(32)
            ident = str(uuid.uuid4())
            self.db.execute("INSERT INTO usuarios(id,nome,sal,hash,perfil) VALUES(?,?,?,?,?)", (ident, nome, sal, senha_hash(senha, sal), perfil))
            self._evento("usuario_criado", ident, perfil)
        return ident

    def entrar(self, nome, senha):
        self.sessao = None
        erro = None
        with self.transacao():
            usuario = self.db.execute("SELECT * FROM usuarios WHERE nome=? COLLATE NOCASE", (nome.strip(),)).fetchone()
            sal = usuario["sal"] if usuario else "00" * 32
            calculado = senha_hash(senha[:129], sal)
            valido = usuario and usuario["ativo"] and hmac.compare_digest(calculado, usuario["hash"])
            if usuario and usuario["bloqueado_ate"] > time.time():
                erro = "Usuário ou senha inválidos, ou acesso temporariamente bloqueado. Aguarde alguns minutos e tente novamente."
            elif not valido:
                if usuario:
                    falhas = usuario["falhas"] + 1
                    self.db.execute("UPDATE usuarios SET falhas=?,bloqueado_ate=? WHERE id=?", (falhas, time.time() + 300 if falhas >= 5 else 0, usuario["id"]))
                self._evento("login_recusado", usuario["id"] if usuario else "", usuario="sistema")
                erro = "Usuário ou senha inválidos, ou acesso temporariamente bloqueado."
            else:
                self.db.execute("UPDATE usuarios SET falhas=0,bloqueado_ate=0 WHERE id=?", (usuario["id"],))
                self.sessao = {"id": usuario["id"], "nome": usuario["nome"], "perfil": usuario["perfil"]}
                self._credencial = usuario["hash"]
                self._evento("login")
        if erro:
            raise ErroCadastro(erro)
        return dict(self.sessao)

    def sair(self):
        if self.sessao:
            with self.transacao():
                self._evento("logout")
        self.sessao = None

    def usuarios(self):
        self.exigir(admin=True)
        return [dict(r) for r in self.db.execute("SELECT id,nome,perfil,ativo FROM usuarios ORDER BY nome")]

    def ativar_usuario(self, ident, ativo):
        with self.transacao():
            ator = self.exigir(admin=True)
            if ident == ator["id"]:
                raise ErroCadastro("Você não pode desativar o próprio acesso.")
            if not self.db.execute("SELECT 1 FROM usuarios WHERE id=?", (ident,)).fetchone():
                raise ErroCadastro("Usuário não encontrado.")
            self.db.execute("UPDATE usuarios SET ativo=? WHERE id=?", (int(bool(ativo)), ident))
            self._evento("usuario_ativado" if ativo else "usuario_desativado", ident)

    def alterar_senha(self, atual, nova, ident=None):
        validar_senha(nova)
        with self.transacao():
            ator = self.exigir(admin=bool(ident))
            if not hmac.compare_digest(senha_hash(atual, ator["sal"]), ator["hash"]):
                raise ErroCadastro("Sua senha atual não confere.")
            alvo = ident or ator["id"]
            if not self.db.execute("SELECT 1 FROM usuarios WHERE id=?", (alvo,)).fetchone():
                raise ErroCadastro("Usuário não encontrado.")
            sal = secrets.token_hex(32)
            self.db.execute("UPDATE usuarios SET sal=?,hash=?,falhas=0,bloqueado_ate=0 WHERE id=?", (sal, senha_hash(nova, sal), alvo))
            self._evento("senha_redefinida", alvo)
        if alvo == ator["id"]:
            self._credencial = self.db.execute("SELECT hash FROM usuarios WHERE id=?", (alvo,)).fetchone()[0]

    def _decodificar(self, linha):
        if not linha:
            return None
        return {**json.loads(linha["dados"]), "id": linha["id"], "_versao": linha["versao"], "excluido_em": linha["excluido_em"]}

    @property
    def clientes(self):
        return self.pesquisar()

    def pesquisar(self, termo=""):
        self.exigir()
        registros = [self._decodificar(r) for r in self.db.execute("SELECT * FROM clientes WHERE excluido_em IS NULL")]
        termo = normalizar(termo.strip())
        digitos = numeros(termo)
        return [r for r in registros if termo in normalizar(" ".join(r[c] for c in CAMPOS)) or (len(digitos) >= 3 and digitos in numeros(r["telefone"]))]

    def obter(self, ident):
        self.exigir()
        return self._decodificar(self.db.execute("SELECT * FROM clientes WHERE id=? AND excluido_em IS NULL", (ident,)).fetchone())

    def _backup_diario(self):
        self.exigir()
        hoje = datetime.now().date().isoformat()
        ultimo = self.db.execute("SELECT valor FROM config WHERE chave='backup_dia'").fetchone()
        if not ultimo or ultimo[0] != hoje:
            self.criar_backup(automatico=True)
            with self.transacao():
                self.db.execute("INSERT OR REPLACE INTO config VALUES('backup_dia',?)", (hoje,))

    def salvar(self, dados, identificador=None):
        self.exigir()
        registro = validar(dados)
        self._backup_diario()
        ident = identificador or str(uuid.uuid4())
        with self.transacao():
            self.exigir()
            if identificador:
                anterior = self.obter(ident)
                if not anterior or dados.get("_versao") != anterior["_versao"]:
                    raise ErroCadastro("Este cadastro foi alterado ou excluído em outra janela. Selecione-o novamente para editar os dados atuais.")
                self.db.execute("UPDATE clientes SET dados=?,telefone=?,email=?,versao=versao+1 WHERE id=?", (json.dumps(registro, ensure_ascii=False), numeros(registro["telefone"]), registro["email"].casefold(), ident))
            else:
                self.db.execute("INSERT INTO clientes(id,dados,telefone,email) VALUES(?,?,?,?)", (ident, json.dumps(registro, ensure_ascii=False), numeros(registro["telefone"]), registro["email"].casefold()))
            self._evento("cliente_alterado" if identificador else "cliente_criado", ident)
        return self.obter(ident)

    def excluir(self, ident):
        self.exigir(admin=True)
        self._backup_diario()
        with self.transacao():
            self.exigir(admin=True)
            registro = self.obter(ident)
            if not registro:
                raise ErroCadastro("Cliente não encontrado.")
            self.db.execute("UPDATE clientes SET excluido_em=?,versao=versao+1 WHERE id=?", (agora(), ident))
            self._evento("cliente_excluido", ident)
        return registro

    def lixeira(self):
        self.exigir(admin=True)
        return [self._decodificar(r) for r in self.db.execute("SELECT * FROM clientes WHERE excluido_em IS NOT NULL ORDER BY excluido_em DESC")]

    def recuperar_cliente(self, ident):
        with self.transacao():
            self.exigir(admin=True)
            if not self.db.execute("SELECT 1 FROM clientes WHERE id=? AND excluido_em IS NOT NULL", (ident,)).fetchone():
                raise ErroCadastro("Este cliente não está na lixeira.")
            self.db.execute("UPDATE clientes SET excluido_em=NULL,versao=versao+1 WHERE id=?", (ident,))
            self._evento("cliente_recuperado", ident)

    def historico(self):
        self.exigir(admin=True)
        return [dict(r) for r in self.db.execute("SELECT * FROM eventos ORDER BY seq DESC LIMIT 500")]

    def registrar_exportacao(self, total):
        with self.transacao():
            self.exigir(admin=True)
            self._evento("exportacao_csv", detalhe=f"{total} cliente(s)")

    def pasta_backups(self):
        return self.arquivo.parent / "backups"

    def destino_externo(self):
        self.exigir(admin=True)
        linha = self.db.execute("SELECT valor FROM config WHERE chave='backup_externo'").fetchone()
        return linha[0] if linha else ""

    def configurar_backup(self, pasta):
        self.exigir(admin=True)
        if pasta and Path(pasta).resolve() in (self.arquivo.parent.resolve(), self.pasta_backups().resolve()):
            raise ErroCadastro("Escolha uma pasta diferente da pasta do banco e da pasta de backups locais.")
        with self.transacao():
            self.db.execute("INSERT OR REPLACE INTO config VALUES('backup_externo',?)", (str(pasta),))
            self._evento("destino_backup_alterado")

    def criar_backup(self, automatico=False):
        self.exigir(admin=not automatico)
        pasta = self.pasta_backups()
        destino = pasta / f"clientes-{'auto' if automatico else 'manual'}-{datetime.now():%Y%m%d-%H%M%S-%f}.sqlite3"
        temporario = destino.with_suffix(".parcial")
        try:
            pasta.mkdir(exist_ok=True)
            with closing(sqlite3.connect(temporario)) as copia:
                self.db.backup(copia)
                if copia.execute("PRAGMA quick_check").fetchone()[0] != "ok":
                    raise OSError("Backup inválido")
            with temporario.open("r+b") as arquivo:
                os.fsync(arquivo.fileno())
            os.replace(temporario, destino)
            config = self.db.execute("SELECT valor FROM config WHERE chave='backup_externo'").fetchone()
            if config and config[0]:
                externo = Path(config[0])
                if not externo.is_dir():
                    raise OSError("Destino externo indisponível")
                parcial = externo / (destino.name + ".parcial")
                shutil.copyfile(destino, parcial)
                if hashlib.sha256(parcial.read_bytes()).digest() != hashlib.sha256(destino.read_bytes()).digest():
                    raise OSError("Cópia externa inválida")
                os.replace(parcial, externo / destino.name)
            with self.transacao():
                self._evento("backup_automatico" if automatico else "backup_manual", detalhe=destino.name)
            return destino
        except (OSError, sqlite3.Error) as erro:
            raise ErroCadastro("Não foi possível concluir o backup local ou externo. Confira o disco e o destino configurado. A operação foi interrompida para proteger os dados.") from erro
        finally:
            if temporario.exists():
                try:
                    temporario.unlink()
                except OSError:
                    pass

    @staticmethod
    def ler_backup(caminho):
        caminho = Path(caminho)
        if not caminho.is_file():
            raise ErroCadastro("O arquivo selecionado não está disponível.")
        if caminho.suffix.lower() == ".json":
            return ArquivoLegado(caminho).clientes
        try:
            with closing(sqlite3.connect(caminho.resolve().as_uri() + "?mode=ro", uri=True)) as origem:
                if origem.execute("PRAGMA quick_check").fetchone()[0] != "ok":
                    raise ValueError("Backup danificado")
                if origem.execute("SELECT valor FROM config WHERE chave='produto'").fetchone()[0] != PRODUTO:
                    raise ValueError("Outro produto")
                origem.row_factory = sqlite3.Row
                registros = [{**json.loads(r["dados"]), "id": r["id"]} for r in origem.execute("SELECT * FROM clientes WHERE excluido_em IS NULL")]
                ids = set()
                for registro in registros:
                    if not isinstance(registro["id"], str) or registro["id"] in ids or not all(isinstance(registro.get(c), str) for c in CAMPOS):
                        raise ValueError("Registro inválido")
                    ids.add(registro["id"])
                return registros
        except (sqlite3.Error, ValueError, TypeError, IndexError, KeyError) as erro:
            raise ErroCadastro("O arquivo não é um backup de clientes válido. Nenhum dado foi substituído.") from erro

    def importar(self, caminho, substituir=False):
        self.exigir(admin=True)
        if Path(caminho).resolve() == self.arquivo.resolve():
            raise ErroCadastro("Escolha uma cópia, e não o banco em uso.")
        registros = self.ler_backup(caminho)
        self.criar_backup()
        with self.transacao():
            self.exigir(admin=True)
            if substituir:
                self.db.execute("DELETE FROM clientes")
            for item in registros:
                # Preserve os textos legados. A validação atual se aplica ao editar.
                registro = {c: item.get(c, "") for c in CAMPOS}
                ident = item["id"] if substituir else str(uuid.uuid4())
                self.db.execute("INSERT INTO clientes(id,dados,telefone,email) VALUES(?,?,?,?)", (ident, json.dumps(registro, ensure_ascii=False), numeros(registro["telefone"]), registro["email"].casefold()))
            self._evento("clientes_restaurados" if substituir else "json_importado", detalhe=f"{len(registros)} registro(s)")
        return len(registros)

    def restaurar_backup(self, caminho):
        return self.importar(caminho, substituir=True)
