"""Regressão: botão inferior acessível em janela baixa e em escala ampliada."""
import tkinter as tk
import unittest
from unittest.mock import MagicMock

from acesso import usuarios
from interface import Aplicativo


class LayoutUsuariosTest(unittest.TestCase):
    def test_formulario_acessivel_e_operante_em_janela_baixa(self):
        for escala in (1.0, 1.8):
            with self.subTest(escala=escala):
                raiz = tk.Tk()
                raiz.withdraw()
                raiz.tk.call("tk", "scaling", escala)
                app = Aplicativo.__new__(Aplicativo)
                app.janela = raiz
                app.estilos()
                banco = MagicMock()
                banco.usuarios.return_value = []
                tela = usuarios(raiz, banco)
                tela.attributes("-alpha", 0)
                try:
                    tela.geometry("600x440")
                    raiz.update()
                    canvas = tela._form_canvas
                    canvas.yview_moveto(1.0)
                    raiz.update()
                    botao = tela._form_submit
                    topo = botao.winfo_rooty()
                    self.assertGreaterEqual(topo, canvas.winfo_rooty())
                    self.assertLessEqual(topo + botao.winfo_height(), canvas.winfo_rooty() + canvas.winfo_height())
                    for var, valor in zip(tela._form_fields, ("funcionario", "senha ficticia de teste", "senha ficticia de teste", "operador")):
                        var.set(valor)
                    botao.invoke()
                    banco.criar_usuario.assert_called_once_with("funcionario", "senha ficticia de teste", "operador")
                    raiz.update()
                    canvas.yview_moveto(1.0)
                    raiz.update()
                    self.assertLessEqual(canvas.winfo_rooty() + canvas.winfo_height(), tela.winfo_rooty() + tela.winfo_height())
                    self.assertLessEqual(botao.winfo_rooty() + botao.winfo_height(), canvas.winfo_rooty() + canvas.winfo_height())
                finally:
                    tela.destroy()
                    raiz.destroy()


if __name__ == "__main__":
    unittest.main()
