import json
import sqlite3
import tempfile
import tkinter as tk
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from banco import CadastroLocal
from main import ErroCadastro
from interface import Aplicativo

SENHA = "frase ficticia para testes 123"


class EmpresaTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.arquivo = Path(self.tmp.name) / "clientes.sqlite3"
        self.banco = CadastroLocal(self.arquivo)
        self.addCleanup(self.banco.fechar)
        self.admin = self.banco.criar_usuario("admin", SENHA, "administrador")
        self.banco.entrar("admin", SENHA)
        self.dados = {"nome": "Ana Fictícia", "telefone": "11987654321", "email": "ana@example.com"}

    def test_sem_login_nao_le_nem_altera_clientes(self):
        self.banco.sair()
        for operacao in (lambda: self.banco.clientes, lambda: self.banco.salvar(self.dados), lambda: self.banco.historico(), lambda: self.banco.criar_backup()):
            with self.assertRaises(ErroCadastro):
                operacao()

    def test_senha_nao_e_guardada_em_texto(self):
        usuario = self.banco.db.execute("SELECT * FROM usuarios").fetchone()
        self.assertNotEqual(usuario["hash"], SENHA)
        self.assertNotIn(SENHA.encode(), self.arquivo.read_bytes())
        self.assertEqual(len(usuario["sal"]), 64)

    def test_operador_nao_exclui_exporta_restaura_nem_gerencia(self):
        ident = self.banco.salvar(self.dados)["id"]
        backup = self.banco.criar_backup()
        self.banco.criar_usuario("funcionario", SENHA)
        self.banco.entrar("funcionario", SENHA)
        for operacao in (lambda: self.banco.excluir(ident), lambda: self.banco.criar_usuario("outro", SENHA), lambda: self.banco.usuarios(), lambda: self.banco.restaurar_backup(backup), lambda: self.banco.registrar_exportacao(1)):
            with self.assertRaises(ErroCadastro):
                operacao()
        cliente = self.banco.obter(ident)
        self.banco.salvar({**cliente, "nome": "Ana Editada"}, ident)
        self.assertEqual(self.banco.obter(ident)["nome"], "Ana Editada")

    def test_usuarios_desativados_perdem_sessao_e_login(self):
        ident = self.banco.criar_usuario("funcionario", SENHA)
        outra = CadastroLocal(self.arquivo)
        self.addCleanup(outra.fechar)
        outra.entrar("funcionario", SENHA)
        self.banco.ativar_usuario(ident, False)
        with self.assertRaises(ErroCadastro):
            outra.pesquisar()
        with self.assertRaises(ErroCadastro):
            outra.entrar("funcionario", SENHA)

    def test_nao_desativa_proprio_admin(self):
        with self.assertRaises(ErroCadastro):
            self.banco.ativar_usuario(self.admin, False)
        self.assertTrue(self.banco.administrador)

    def test_bloqueio_persiste_depois_de_cinco_erros(self):
        for _ in range(5):
            with self.assertRaises(ErroCadastro):
                self.banco.entrar("admin", "incorreta")
        with self.assertRaises(ErroCadastro):
            self.banco.entrar("admin", SENHA)
        outra = CadastroLocal(self.arquivo)
        self.addCleanup(outra.fechar)
        with self.assertRaises(ErroCadastro):
            outra.entrar("admin", SENHA)

    def test_alteracao_senha_exige_senha_atual(self):
        with self.assertRaises(ErroCadastro):
            self.banco.alterar_senha("errada", "outra frase ficticia 123")
        self.banco.alterar_senha(SENHA, "outra frase ficticia 123")
        with self.assertRaises(ErroCadastro):
            self.banco.entrar("admin", SENHA)
        self.banco.entrar("admin", "outra frase ficticia 123")

    def test_reset_de_senha_revoga_sessao_antiga(self):
        ident = self.banco.criar_usuario("funcionario", SENHA)
        outra = CadastroLocal(self.arquivo)
        self.addCleanup(outra.fechar)
        outra.entrar("funcionario", SENHA)
        self.banco.alterar_senha(SENHA, "nova frase ficticia para teste", ident)
        with self.assertRaises(ErroCadastro):
            outra.pesquisar()

    def test_duplicados_e_conflito_de_edicao(self):
        cliente = self.banco.salvar(self.dados)
        with self.assertRaises(ErroCadastro):
            self.banco.salvar(self.dados)
        outra = CadastroLocal(self.arquivo)
        self.addCleanup(outra.fechar)
        outra.entrar("admin", SENHA)
        antiga = outra.obter(cliente["id"])
        self.banco.salvar({**cliente, "nome": "Nome mais novo"}, cliente["id"])
        with self.assertRaisesRegex(ErroCadastro, "outra janela"):
            outra.salvar({**antiga, "nome": "Nome antigo"}, cliente["id"])
        self.assertEqual(self.banco.obter(cliente["id"])["nome"], "Nome mais novo")

    def test_falha_no_evento_reverte_alteracao_de_cliente(self):
        self.banco._backup_diario()
        with patch.object(self.banco, "_evento", side_effect=RuntimeError("falha simulada")):
            with self.assertRaises(RuntimeError):
                self.banco.salvar(self.dados)
        self.assertEqual(self.banco.clientes, [])

    def test_lixeira_e_recuperacao(self):
        cliente = self.banco.salvar(self.dados)
        self.banco.excluir(cliente["id"])
        self.assertFalse(self.banco.clientes)
        self.assertEqual(self.banco.lixeira()[0]["id"], cliente["id"])
        self.banco.recuperar_cliente(cliente["id"])
        self.assertEqual(len(self.banco.clientes), 1)
        self.assertFalse(self.banco.lixeira())

    def test_restaurar_preserva_usuarios_e_historico_atuais(self):
        self.banco.salvar(self.dados)
        backup = self.banco.criar_backup()
        ident = self.banco.criar_usuario("novo_admin", SENHA, "administrador")
        self.banco.salvar({**self.dados, "nome": "Outra pessoa", "telefone": "11999998888", "email": "outra@example.com"})
        self.assertEqual(self.banco.restaurar_backup(backup), 1)
        self.assertTrue(any(u["id"] == ident for u in self.banco.usuarios()))
        acoes = [e["acao"] for e in self.banco.historico()]
        self.assertIn("clientes_restaurados", acoes)
        self.assertIn("usuario_criado", acoes)

    def test_importacao_legada_preserva_origem_e_nao_soma_parcial(self):
        origem = Path(self.tmp.name) / "legado.json"
        conteudo = json.dumps([["Nome Antigo", "11987654321"], ["Outro Antigo", "11999998888"]])
        origem.write_text(conteudo)
        self.banco.importar(origem)
        self.assertEqual(len(self.banco.clientes), 2)
        self.assertEqual(origem.read_text(), conteudo)
        self.assertEqual(self.banco.clientes[0]["email"], "")
        with self.assertRaises(ErroCadastro):
            self.banco.importar(origem)
        self.assertEqual(len(self.banco.clientes), 2)

    def test_backup_externo_e_falha_impede_primeira_gravacao_do_dia(self):
        externo = Path(self.tmp.name) / "externo"
        externo.mkdir()
        self.banco.configurar_backup(externo)
        backup = self.banco.criar_backup()
        self.assertEqual(backup.read_bytes(), (externo / backup.name).read_bytes())
        self.banco.configurar_backup(externo / "ausente")
        with self.assertRaises(ErroCadastro):
            self.banco.salvar(self.dados)
        self.assertFalse(self.banco.clientes)

    def test_backup_corrompido_nao_altera_base(self):
        self.banco.salvar(self.dados)
        invalido = Path(self.tmp.name) / "invalido.sqlite3"
        invalido.write_bytes(b"invalido")
        with self.assertRaises(ErroCadastro):
            self.banco.restaurar_backup(invalido)
        self.assertEqual(len(self.banco.clientes), 1)

    def test_banco_de_outro_programa_nao_e_modificado(self):
        caminho = Path(self.tmp.name) / "outro.db"
        with closing(sqlite3.connect(caminho)) as db:
            db.execute("CREATE TABLE meu_dado(valor TEXT)")
            db.commit()
        antes = caminho.read_bytes()
        with self.assertRaises(ErroCadastro):
            CadastroLocal(caminho)
        self.assertEqual(antes, caminho.read_bytes())

    def test_ui_cadastra_e_edita_com_versao(self):
        raiz = tk.Tk()
        raiz.withdraw()
        app = Aplicativo(raiz, self.banco)
        try:
            app.variaveis["nome"].set("Ana UI")
            app.variaveis["telefone"].set("11987654321")
            app.salvar()
            ident = self.banco.clientes[0]["id"]
            app.tabela.selection_set(ident)
            app.editar()
            app.variaveis["nome"].set("Ana UI Editada")
            app.salvar()
            self.assertEqual(self.banco.obter(ident)["nome"], "Ana UI Editada")
        finally:
            app.fechado = True
            for tarefa in raiz.tk.call("after", "info"):
                raiz.after_cancel(tarefa)
            raiz.destroy()

    def test_senhas_curtas_e_perfis_invalidos_sao_recusados(self):
        with self.assertRaises(ErroCadastro):
            self.banco.criar_usuario("teste", "1234")
        with self.assertRaises(ErroCadastro):
            self.banco.criar_usuario("teste", SENHA, "superuser")


if __name__ == "__main__":
    unittest.main()
