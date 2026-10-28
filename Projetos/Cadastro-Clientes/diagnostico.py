"""Diagnóstico do pacote, exclusivamente com uma base temporária fictícia."""
import json
import tempfile
from pathlib import Path


def executar_diagnostico(saida):
    saida = Path(saida).resolve()
    saida.parent.mkdir(parents=True, exist_ok=True)
    resultado = {"versao": "3.0.1", "ok": False}
    try:
        import tkinter as tk
        from banco import CadastroLocal
        from interface import Aplicativo
        with tempfile.TemporaryDirectory(dir=saida.parent) as pasta:
            banco = CadastroLocal(Path(pasta) / "diagnostico.sqlite3")
            banco.criar_usuario("teste", "frase ficticia para testes", "administrador")
            banco.entrar("teste", "frase ficticia para testes")
            raiz = tk.Tk()
            raiz.withdraw()
            app = Aplicativo(raiz, banco)
            app.variaveis["nome"].set("Cliente fictício")
            app.variaveis["telefone"].set("11987654321")
            app.salvar()
            assert len(banco.clientes) == 1
            backup = banco.criar_backup()
            ident = banco.clientes[0]["id"]
            banco.excluir(ident)
            assert not banco.clientes
            banco.restaurar_backup(backup)
            assert len(banco.clientes) == 1
            app.fechado = True
            for tarefa in raiz.tk.call("after", "info"):
                raiz.after_cancel(tarefa)
            raiz.destroy()
            banco.fechar()
            resultado.update(ok=True, verificacoes=["Tkinter", "SQLite", "login", "formulario", "cadastro", "backup", "exclusao", "restauracao"])
    except Exception as erro:
        resultado["erro"] = str(erro)
    saida.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
