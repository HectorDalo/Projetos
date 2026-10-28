@echo off
setlocal
cd /d "%~dp0"
if exist "%~dp0.venv\Scripts\pythonw.exe" (
    start "" "%~dp0.venv\Scripts\pythonw.exe" "%~dp0Iniciar.pyw"
    exit /b
)
where pyw >nul 2>nul
if not errorlevel 1 (
    start "" pyw -3 "%~dp0Iniciar.pyw"
    exit /b
)
where pythonw >nul 2>nul
if not errorlevel 1 (
    start "" pythonw "%~dp0Iniciar.pyw"
    exit /b
)
echo Nao foi possivel localizar o Python.
echo Instale o Python 3.10 ou superior com Tcl/Tk e tente novamente.
pause
