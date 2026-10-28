"""Abra com duplo clique em computadores com Python e Tkinter instalados."""
import traceback
from pathlib import Path

try:
    from interface import executar
    executar()
except Exception:
    detalhes = traceback.format_exc()
    try:
        Path(__file__).with_name("erro-inicializacao.log").write_text(detalhes, encoding="utf-8")
    except OSError:
        pass
    import tkinter as tk
    from tkinter import messagebox
    raiz = tk.Tk()
    raiz.withdraw()
    messagebox.showerror("Não foi possível iniciar", "O aplicativo encontrou uma falha ao iniciar. Verifique se o Python com Tkinter está instalado. Os detalhes estão em erro-inicializacao.log.")
    raiz.destroy()
