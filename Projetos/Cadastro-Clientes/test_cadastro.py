"""Testes com arquivos temporários; nunca alteram a base real."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from main import Cadastro, ErroCadastro, validar
from cep import consultar_cep


class CadastroTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.arquivo = Path(self.tmp.name) / "clientes.json"
        self.cadastro = Cadastro(self.arquivo)
        self.dados = {"nome": "Ana Silva", "telefone": "11987654321", "email": "ana@example.com", "cep": "01001000", "logradouro": "Praça da Sé", "numero": "12", "cidade": "São Paulo", "uf": "sp"}

    def test_criar_editar_reabrir_e_excluir(self):
        cliente = self.cadastro.salvar(self.dados)
        self.assertEqual(cliente["telefone"], "(11) 98765-4321")
        self.assertEqual(cliente["cep"], "01001-000")
        self.assertEqual(cliente["uf"], "SP")
        editado = self.cadastro.salvar({**cliente, "nome": "Ana Souza", "numero": "15"}, cliente["id"])
        self.assertEqual(editado["id"], cliente["id"])
        reaberto = Cadastro(self.arquivo)
        self.assertEqual(reaberto.obter(cliente["id"])["numero"], "15")
        reaberto.excluir(cliente["id"])
        self.assertEqual(Cadastro(self.arquivo).clientes, [])
        self.assertEqual(len(list((self.arquivo.parent / "backups").glob("*.json"))), 2)

    def test_migracao_preserva_clientes_antigos_e_backup_exato(self):
        original = json.dumps([["Cliente Antigo", "11987654321"]]).encode()
        self.arquivo.write_bytes(original)
        cadastro = Cadastro(self.arquivo)
        self.assertEqual(self.arquivo.read_bytes(), original)
        cliente = cadastro.clientes[0]
        self.assertEqual(cliente["email"], "")
        cadastro.salvar({**cliente, "email": "cliente@example.com"}, cliente["id"])
        self.assertEqual(next((self.arquivo.parent / "backups").iterdir()).read_bytes(), original)

    def test_falha_ao_gravar_nao_muda_memoria_ou_disco(self):
        cliente = self.cadastro.salvar(self.dados)
        original = self.arquivo.read_bytes()
        with patch("main.os.replace", side_effect=PermissionError):
            with self.assertRaises(ErroCadastro):
                self.cadastro.salvar({**cliente, "nome": "Novo nome"}, cliente["id"])
        self.assertEqual(self.cadastro.obter(cliente["id"])["nome"], "Ana Silva")
        self.assertEqual(self.arquivo.read_bytes(), original)
        self.assertEqual(list(self.arquivo.parent.glob("*.tmp")), [])

    def test_falha_no_backup_impede_alteracao(self):
        cliente = self.cadastro.salvar(self.dados)
        original = self.arquivo.read_bytes()
        with patch("main.shutil.copy2", side_effect=PermissionError):
            with self.assertRaises(ErroCadastro):
                self.cadastro.excluir(cliente["id"])
        self.assertEqual(self.arquivo.read_bytes(), original)
        self.assertIsNotNone(self.cadastro.obter(cliente["id"]))

    def test_dados_corrompidos_nao_sao_sobrescritos(self):
        for texto in ('{quebrado', '{"clientes": []}', '[["Nome"]]', '[{"nome":"A","telefone":null}]'):
            self.arquivo.write_text(texto, encoding="utf-8")
            with self.assertRaises(ErroCadastro):
                Cadastro(self.arquivo)
            self.assertEqual(self.arquivo.read_text(encoding="utf-8"), texto)

    def test_nao_sobrescreve_alteracao_de_outra_janela(self):
        outra = Cadastro(self.arquivo)
        self.cadastro.salvar(self.dados)
        with self.assertRaisesRegex(ErroCadastro, "outra janela"):
            outra.salvar({**self.dados, "telefone": "11999998888", "email": "outra@example.com"})
        self.assertEqual(len(Cadastro(self.arquivo).clientes), 1)

    def test_duplicidade_telefone_email_e_homonimos(self):
        cliente = self.cadastro.salvar(self.dados)
        for dados in ({**self.dados, "email": "b@example.com"}, {**self.dados, "telefone": "11999998888", "email": "ANA@example.com"}):
            with self.assertRaises(ErroCadastro):
                self.cadastro.salvar(dados)
        outro = self.cadastro.salvar({**self.dados, "telefone": "11999998888", "email": "b@example.com"})
        self.assertNotEqual(outro["id"], cliente["id"])
        self.cadastro.excluir(outro["id"])
        self.assertEqual(self.cadastro.clientes[0]["id"], cliente["id"])

    def test_validacoes_indicam_campo(self):
        for campo, valor in (("nome", " "), ("telefone", "00000000000"), ("telefone", "11abc987654321"), ("email", "ana@"), ("cep", "123"), ("cep", "abc01001000"), ("uf", "XX")):
            with self.subTest(campo=campo, valor=valor):
                with self.assertRaises(ErroCadastro) as ctx:
                    validar({**self.dados, campo: valor})
                self.assertEqual(ctx.exception.campo, campo)

    def test_campos_opcionais_e_telefone_fixo(self):
        registro = validar({"nome": "Ana", "telefone": "(11) 3456-7890"})
        self.assertEqual(registro["telefone"], "(11) 3456-7890")
        self.assertEqual(registro["email"], "")

    def test_busca_parcial_sem_acentos_e_telefone_sem_mascara(self):
        self.cadastro.salvar(self.dados)
        for termo in ("ANA", "sao paulo", "ana@", "987654", "praca"):
            self.assertEqual(len(self.cadastro.pesquisar(termo)), 1)
        self.assertEqual(self.cadastro.pesquisar("inexistente"), [])

    def test_editar_id_inexistente_nao_cria_cliente(self):
        with self.assertRaises(ErroCadastro):
            self.cadastro.salvar(self.dados, "inexistente")
        self.assertFalse(self.arquivo.exists())

    def test_backup_manual_restaura_e_preserva_estado_anterior(self):
        cliente = self.cadastro.salvar(self.dados)
        backup = self.cadastro.criar_backup()
        self.cadastro.salvar({**cliente, "nome": "Nome atualizado"}, cliente["id"])
        anterior = self.arquivo.read_bytes()
        self.assertEqual(self.cadastro.restaurar_backup(backup), 1)
        self.assertEqual(self.cadastro.obter(cliente["id"])["nome"], "Ana Silva")
        self.assertTrue(any(p.read_bytes() == anterior for p in backup.parent.glob("*.json")))

    def test_backup_vazio_e_restauracao_legada(self):
        backup = self.cadastro.criar_backup()
        self.assertEqual(json.loads(backup.read_text()), [])
        self.assertFalse(self.arquivo.exists())
        legado = Path(self.tmp.name) / "antigo.json"
        legado.write_text(json.dumps([["Nome antigo", "11987654321"]]))
        self.cadastro.restaurar_backup(legado)
        self.assertEqual(self.cadastro.clientes[0]["nome"], "Nome antigo")

    def test_restauracao_invalida_ou_indisponivel_nao_altera_base(self):
        self.cadastro.salvar(self.dados)
        original = self.arquivo.read_bytes()
        invalido = Path(self.tmp.name) / "invalido.json"
        invalido.write_text("quebrado")
        for caminho in (invalido, self.arquivo, invalido.with_name("ausente.json")):
            with self.assertRaises(ErroCadastro):
                self.cadastro.restaurar_backup(caminho)
            self.assertEqual(self.arquivo.read_bytes(), original)

    def test_cep_nao_consulta_formato_invalido(self):
        with patch("cep.urlopen") as abrir:
            with self.assertRaises(ErroCadastro):
                consultar_cep("123")
            abrir.assert_not_called()

    def test_cep_consulta_e_trata_inexistente_ou_sem_conexao(self):
        with patch("cep.urlopen") as abrir:
            resposta = abrir.return_value.__enter__.return_value
            resposta.read.return_value = json.dumps({"logradouro": "Praça da Sé", "bairro": "Sé", "localidade": "São Paulo", "uf": "SP"}).encode()
            self.assertEqual(consultar_cep("01001-000")["cidade"], "São Paulo")
            resposta.read.return_value = b'{"erro": true}'
            with self.assertRaisesRegex(ErroCadastro, "não encontrado"):
                consultar_cep("99999999")
            abrir.side_effect = TimeoutError
            with self.assertRaisesRegex(ErroCadastro, "manualmente"):
                consultar_cep("01001000")


if __name__ == "__main__":
    unittest.main()
