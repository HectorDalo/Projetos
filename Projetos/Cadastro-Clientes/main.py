"""Cadastro local de clientes: validação, persistência segura e modo terminal."""
from __future__ import annotations

import copy
import json
import os
import re
import shutil
import tempfile
import unicodedata
import uuid
from datetime import datetime
from pathlib import Path

PASTA_PROJETO = Path(__file__).resolve().parent
ARQUIVO_CLIENTES = PASTA_PROJETO / "clientes.json"
CAMPOS = ("nome", "telefone", "email", "cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "observacoes")
ESTADOS = tuple("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split())


class ErroCadastro(Exception):
    def __init__(self, mensagem, campo=None):
        super().__init__(mensagem)
        self.campo = campo


def numeros(texto):
    return re.sub(r"[^0-9]", "", texto)


def normalizar(texto):
    return "".join(c for c in unicodedata.normalize("NFD", texto.casefold()) if not unicodedata.combining(c))


def formatar_telefone(texto):
    valor = numeros(texto)
    if len(valor) not in (10, 11):
        return texto.strip()
    corte = 7 if len(valor) == 11 else 6
    return f"({valor[:2]}) {valor[2:corte]}-{valor[corte:]}"


def telefone_valido(texto):
    valor = numeros(texto)
    return bool(re.fullmatch(r"[0-9 ()+.-]+", texto.strip())) and len(valor) in (10, 11) and valor[:2] in {
        str(i) for i in (11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99)
    } and (valor[2] == "9" if len(valor) == 11 else valor[2] in "2345")


def validar(dados):
    registro = {campo: str(dados.get(campo, "")).strip() for campo in CAMPOS}
    registro["nome"] = " ".join(registro["nome"].split())
    registro["uf"] = registro["uf"].upper()
    if len(registro["nome"]) < 2:
        raise ErroCadastro("Informe o nome do cliente com pelo menos 2 caracteres.", "nome")
    if not telefone_valido(registro["telefone"]):
        raise ErroCadastro("Informe um telefone brasileiro com DDD válido: (11) 98765-4321 ou (11) 3456-7890.", "telefone")
    registro["telefone"] = formatar_telefone(registro["telefone"])
    email = registro["email"]
    if email and (len(email) > 254 or not re.fullmatch(r"[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>.]{2,}", email) or ".." in email):
        raise ErroCadastro("Confira o e-mail. Use um endereço como nome@empresa.com.br.", "email")
    if registro["cep"]:
        if not re.fullmatch(r"[0-9]{5}-?[0-9]{3}", registro["cep"]):
            raise ErroCadastro("O CEP deve ter 8 dígitos, por exemplo: 01001-000.", "cep")
        cep = numeros(registro["cep"])
        registro["cep"] = f"{cep[:5]}-{cep[5:]}"
    if registro["uf"] and registro["uf"] not in ESTADOS:
        raise ErroCadastro("Selecione uma UF brasileira válida.", "uf")
    for campo, valor in registro.items():
        if len(valor) > (2000 if campo == "observacoes" else 254):
            raise ErroCadastro("O texto ultrapassa o limite permitido para este campo.", campo)
        if any(ord(c) < 32 and c not in "\n\t" for c in valor):
            raise ErroCadastro("Remova os caracteres de controle deste campo.", campo)
    return registro


class Cadastro:
    def __init__(self, arquivo=ARQUIVO_CLIENTES):
        self.arquivo = Path(arquivo)
        self.clientes = []
        self._original = None
        self.carregar()

    def carregar(self):
        try:
            raw = self.arquivo.read_bytes() if self.arquivo.exists() else None
            dados = json.loads(raw.decode("utf-8-sig")) if raw is not None else []
            if not isinstance(dados, list):
                raise ValueError("Formato de dados incompatível")
            clientes = []
            ids = set()
            for item in dados:
                if isinstance(item, list) and len(item) == 2 and all(isinstance(v, str) for v in item):
                    item = {"nome": item[0], "telefone": item[1]}
                if not isinstance(item, dict) or not all(isinstance(item.get(k), str) for k in ("nome", "telefone")):
                    raise ValueError("Registro inválido")
                if any(k in item and not isinstance(item[k], str) for k in CAMPOS):
                    raise ValueError("Campo inválido")
                registro = dict(item)
                for campo in CAMPOS:
                    registro.setdefault(campo, "")
                identificador = registro.get("id") or str(uuid.uuid4())
                if not isinstance(identificador, str) or identificador in ids:
                    raise ValueError("Identificador inválido ou duplicado")
                registro["id"] = identificador
                ids.add(identificador)
                clientes.append(registro)
            self.clientes = clientes
            self._original = raw
        except (OSError, ValueError, UnicodeError) as erro:
            raise ErroCadastro("Não foi possível abrir clientes.json. O arquivo foi preservado. Verifique o acesso ou restaure uma cópia da pasta backups antes de continuar.") from erro

    def _gravar(self, clientes):
        temporario = None
        try:
            atual = self.arquivo.read_bytes() if self.arquivo.exists() else None
            if atual != self._original:
                raise ErroCadastro("Os dados foram alterados por outra janela ou programa. Feche e abra o cadastro novamente antes de salvar.")
            conteudo = (json.dumps(clientes, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
            with tempfile.NamedTemporaryFile(dir=self.arquivo.parent, prefix=".clientes-", suffix=".tmp", delete=False) as arquivo:
                temporario = Path(arquivo.name)
                arquivo.write(conteudo)
                arquivo.flush()
                os.fsync(arquivo.fileno())
            if atual is not None:
                pasta = self.arquivo.parent / "backups"
                pasta.mkdir(exist_ok=True)
                shutil.copy2(self.arquivo, pasta / f"clientes-{datetime.now():%Y%m%d-%H%M%S-%f}.json")
            os.replace(temporario, self.arquivo)
            self._original = conteudo
            self.clientes = clientes
        except OSError as erro:
            raise ErroCadastro("Não foi possível salvar. Nenhuma alteração foi aplicada. Confira o espaço em disco e a permissão da pasta e tente novamente.") from erro
        finally:
            if temporario and temporario.exists():
                try:
                    temporario.unlink(missing_ok=True)
                except OSError:
                    pass  # Não oculte o erro de salvamento se a limpeza falhar.

    def salvar(self, dados, identificador=None):
        registro = validar(dados)
        anterior = self.obter(identificador) if identificador else None
        if identificador and anterior is None:
            raise ErroCadastro("Este cliente não está mais disponível. Atualize a lista e selecione o registro novamente.")
        for cliente in self.clientes:
            if cliente["id"] == identificador:
                continue
            if numeros(cliente["telefone"]) == numeros(registro["telefone"]):
                raise ErroCadastro("Este telefone já está vinculado a outro cliente. Localize o cadastro existente para editá-lo.", "telefone")
            if registro["email"] and cliente["email"].casefold() == registro["email"].casefold():
                raise ErroCadastro("Este e-mail já está vinculado a outro cliente. Confira o endereço informado.", "email")
        # Pessoas diferentes podem ter o mesmo nome; a identidade é o ID estável.
        agora = datetime.now().astimezone().isoformat(timespec="seconds")
        registro = {**(anterior or {}), **registro, "id": identificador or str(uuid.uuid4()), "atualizado_em": agora}
        registro.setdefault("criado_em", agora)
        novos = [registro if c["id"] == identificador else copy.deepcopy(c) for c in self.clientes]
        if not identificador:
            novos.append(registro)
        self._gravar(novos)
        return copy.deepcopy(registro)

    def obter(self, identificador):
        return next((copy.deepcopy(c) for c in self.clientes if c["id"] == identificador), None)

    def criar_backup(self):
        """Cria uma cópia completa, independentemente do filtro da interface."""
        destino = None
        try:
            atual = self.arquivo.read_bytes() if self.arquivo.exists() else None
            if atual != self._original:
                raise ErroCadastro("Os dados foram alterados por outra janela. Reabra o aplicativo antes de criar o backup.")
            pasta = self.arquivo.parent / "backups"
            pasta.mkdir(exist_ok=True)
            destino = pasta / f"clientes-manual-{datetime.now():%Y%m%d-%H%M%S-%f}.json"
            # O formato original também é um backup válido. Para uma base ainda
            # não salva, produz uma lista vazia sem alterar o arquivo principal.
            with destino.open("xb") as copia:
                copia.write(atual if atual is not None else b"[]\n")
                copia.flush()
                os.fsync(copia.fileno())
            return destino
        except OSError as erro:
            if destino:
                try:
                    destino.unlink(missing_ok=True)
                except OSError:
                    pass
            raise ErroCadastro("Não foi possível criar o backup. Confira o acesso à pasta e o espaço em disco e tente novamente.") from erro

    def restaurar_backup(self, caminho):
        """Valida antes de substituir; _gravar preserva a base atual em backup."""
        caminho = Path(caminho)
        if caminho.resolve() == self.arquivo.resolve():
            raise ErroCadastro("Selecione um arquivo da pasta backups, e não o arquivo atual de clientes.")
        if not caminho.is_file():
            raise ErroCadastro("O backup selecionado não está disponível. Escolha outro arquivo.")
        try:
            copia = Cadastro(caminho)
        except ErroCadastro as erro:
            raise ErroCadastro("Este arquivo não é um backup de clientes válido. Os dados atuais foram mantidos.") from erro
        self._gravar(copy.deepcopy(copia.clientes))
        return len(self.clientes)

    def excluir(self, identificador):
        registro = self.obter(identificador)
        if not registro:
            raise ErroCadastro("Selecione um cliente existente antes de excluir.")
        self._gravar([copy.deepcopy(c) for c in self.clientes if c["id"] != identificador])
        return registro

    def pesquisar(self, termo=""):
        termo = normalizar(termo.strip())
        digitos = numeros(termo)
        return [copy.deepcopy(c) for c in self.clientes if termo in normalizar(" ".join(c[k] for k in CAMPOS)) or (len(digitos) >= 3 and digitos in numeros(c["telefone"]))]


def executar_terminal():
    try:
        cadastro = Cadastro()
        while True:
            print("\nCADASTRO DE CLIENTES\n1 — Listar / pesquisar\n2 — Cadastrar\n3 — Editar\n4 — Excluir\n0 — Sair")
            opcao = input("Opção: ").strip()
            try:
                if opcao == "0":
                    break
                if opcao == "1":
                    for c in cadastro.pesquisar(input("Pesquisar (Enter para todos): ")):
                        print(f"{c['id']} | {c['nome']} | {c['telefone']} | {c['email']} | {c['cidade']}")
                elif opcao in ("2", "3"):
                    ident = input("ID do cliente: ").strip() if opcao == "3" else None
                    anterior = cadastro.obter(ident) if ident else {}
                    if ident and not anterior:
                        raise ErroCadastro("Cliente não encontrado.")
                    dados = {}
                    for campo in CAMPOS:
                        valor = input(f"{campo.capitalize()}" + (f" [{anterior.get(campo, '')}]" if ident else "") + ": ")
                        dados[campo] = valor or anterior.get(campo, "")
                    cadastro.salvar(dados, ident)
                    print("Cadastro salvo com sucesso.")
                elif opcao == "4":
                    ident = input("ID do cliente: ").strip()
                    if input("Digite EXCLUIR para confirmar: ") == "EXCLUIR":
                        cadastro.excluir(ident)
                        print("Cliente excluído. Uma cópia anterior está em backups.")
                else:
                    print("Escolha uma das opções disponíveis.")
            except ErroCadastro as erro:
                print(f"Atenção: {erro}")
    except ErroCadastro as erro:
        print(erro)


if __name__ == "__main__":
    # A edição Local usa a mesma autenticação também quando iniciada por aqui.
    from interface import executar
    executar()
