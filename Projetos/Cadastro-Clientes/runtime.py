"""Bloqueio de instância local sem rede nem privilégios de administrador."""
import hashlib
import os

_handle = None


def bloquear_instancia(arquivo):
    global _handle
    if os.name != "nt":
        return True
    import ctypes
    from ctypes import wintypes
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.CreateMutexW.argtypes = (ctypes.c_void_p, wintypes.BOOL, wintypes.LPCWSTR)
    kernel.CreateMutexW.restype = wintypes.HANDLE
    nome = "Local\\HDClientes-" + hashlib.sha256(str(arquivo.resolve()).casefold().encode()).hexdigest()
    handle = kernel.CreateMutexW(None, False, nome)
    if not handle:
        raise OSError("Não foi possível verificar se o aplicativo já está aberto.")
    if ctypes.get_last_error() == 183:
        kernel.CloseHandle.argtypes = (wintypes.HANDLE,)
        kernel.CloseHandle(handle)
        return False
    _handle = handle
    return True


def liberar_instancia():
    global _handle
    if _handle and os.name == "nt":
        import ctypes
        from ctypes import wintypes
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.CloseHandle.argtypes = (wintypes.HANDLE,)
        kernel.CloseHandle(_handle)
        _handle = None
