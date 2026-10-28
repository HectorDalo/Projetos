"""Integração do formulário com uma base temporária isolada."""
import tempfile
import tkinter as tk
import unittest
from pathlib import Path
from unittest.mock import patch

from interface import Aplicativo
from main import Cadastro


class InterfaceTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.raiz = tk.Tk()
        self.raiz.withdraw()
        self.cadastro = Cadastro(Path(self.tmp.name) / "clientes.json")
        self.app = Aplicativo(self.raiz, self.cadastro)
        self.addCleanup(self.destruir)

    def destruir(self):
        self.app.fechado = True
        for tarefa in self.raiz.tk.call("after", "info"):
            self.raiz.after_cancel(tarefa)
        self.raiz.destroy()

    def preencher(self, nome="Ana Teste", telefone="11987654321"):
        self.app.variaveis["nome"].set(nome)
        self.app.variaveis["telefone"].set(telefone)

    def test_salvar_editar_pesquisar_e_excluir_por_id(self):
        self.preencher()
        self.app.salvar()
        ident = self.cadastro.clientes[0]["id"]
        self.assertEqual(self.app.editando, None)
        self.assertIn("sucesso", self.app.aviso.cget("text"))
        self.app.busca.set("ANA")
        self.app.tabela.selection_set(ident)
        self.app.editar()
        self.app.variaveis["nome"].set("Ana Atualizada")
        self.app.variaveis["email"].set("ana@example.com")
        self.app.salvar()
        self.assertEqual(self.cadastro.obter(ident)["email"], "ana@example.com")
        with patch("interface.messagebox.askyesno", return_value=True):
            self.app.tabela.selection_set(ident)
            self.app.excluir()
        self.assertEqual(self.cadastro.clientes, [])

    def test_erro_nao_limpa_formulario_e_sinaliza_campo(self):
        self.preencher(telefone="123")
        self.app.salvar()
        self.assertEqual(self.app.variaveis["nome"].get(), "Ana Teste")
        self.assertIn("invalid", self.app.campos["telefone"].state())
        self.assertEqual(self.cadastro.clientes, [])

    def test_cancelar_descarte_preserva_edicao(self):
        self.preencher()
        with patch("interface.messagebox.askyesno", return_value=False):
            self.app.novo()
        self.assertEqual(self.app.variaveis["nome"].get(), "Ana Teste")

    def test_consulta_atrasada_nao_muda_outro_formulario(self):
        self.app.requisicao = 2
        self.app.respostas.put((1, "01001000", self.app.dados(), {"cidade": "São Paulo"}))
        self.app.processar_respostas()
        self.assertEqual(self.app.variaveis["cidade"].get(), "")

    def test_consulta_nao_sobrescreve_campo_digitado_enquanto_aguarda(self):
        self.app.variaveis["cep"].set("01001-000")
        original = self.app.dados()
        self.app.variaveis["cidade"].set("Cidade digitada")
        self.app.respostas.put((self.app.requisicao, "01001000", original, {"cidade": "São Paulo", "uf": "SP"}))
        self.app.processar_respostas()
        self.assertEqual(self.app.variaveis["cidade"].get(), "Cidade digitada")
        self.assertEqual(self.app.variaveis["uf"].get(), "SP")

    def test_botoes_backup_e_restauracao_com_confirmacao(self):
        self.preencher()
        self.app.salvar()
        self.app.criar_backup()
        pasta = self.cadastro.arquivo.parent / "backups"
        backup = next(pasta.glob("clientes-manual-*.json"))
        self.cadastro.excluir(self.cadastro.clientes[0]["id"])
        with patch("interface.filedialog.askopenfilename", return_value=str(backup)), patch("interface.messagebox.askyesno", return_value=False):
            self.app.restaurar_backup()
        self.assertEqual(self.cadastro.clientes, [])
        with patch("interface.filedialog.askopenfilename", return_value=str(backup)), patch("interface.messagebox.askyesno", return_value=True):
            self.app.restaurar_backup()
        self.assertEqual(len(self.cadastro.clientes), 1)
        self.assertIn("restaurado", self.app.aviso.cget("text"))

    def test_exportacao_so_inclui_resultados_e_neutraliza_formula(self):
        registro = self.cadastro.salvar({"nome": "=Teste", "telefone": "11987654321"})
        self.cadastro.salvar({"nome": "Outra pessoa", "telefone": "11999998888"})
        self.app.busca.set("=Teste")
        destino = Path(self.tmp.name) / "export.csv"
        with patch("interface.filedialog.asksaveasfilename", return_value=str(destino)):
            self.app.exportar()
        texto = destino.read_text(encoding="utf-8-sig")
        self.assertIn("'=Teste", texto)
        self.assertNotIn("Outra pessoa", texto)


if __name__ == "__main__":
    unittest.main()
