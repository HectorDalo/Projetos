"""Consulta opcional: apenas o CEP informado é enviado ao ViaCEP."""
import json
import re
from urllib.request import Request, urlopen
from urllib.error import URLError

from main import ErroCadastro


def consultar_cep(cep):
    if not re.fullmatch(r"[0-9]{5}-?[0-9]{3}", cep.strip()):
        raise ErroCadastro("Informe os 8 dígitos do CEP antes de consultar.", "cep")
    numero = cep.replace("-", "").strip()
    try:
        pedido = Request(f"https://viacep.com.br/ws/{numero}/json/", headers={"User-Agent": "CadastroClientes/2.0"})
        with urlopen(pedido, timeout=6) as resposta:
            dados = json.loads(resposta.read(16384).decode("utf-8"))
        if not isinstance(dados, dict):
            raise ValueError("Resposta inválida")
        if dados.get("erro"):
            raise ErroCadastro("CEP não encontrado. Confira o número ou preencha o endereço manualmente.", "cep")
        campos = {"logradouro": "logradouro", "bairro": "bairro", "cidade": "localidade", "uf": "uf"}
        if not all(isinstance(dados.get(origem, ""), str) for origem in campos.values()):
            raise ValueError("Resposta inválida")
        return {destino: dados.get(origem, "") for destino, origem in campos.items()}
    except (URLError, OSError, ValueError) as erro:
        raise ErroCadastro("A consulta de CEP está indisponível. Você pode preencher o endereço manualmente e salvar normalmente.", "cep") from erro
