param(
  [string]$Python = 'E:\Codex\CadastroClientes\ambiente\Scripts\python.exe',
  [string]$Destino = 'E:\Codex\CadastroClientes\compilacao'
)
$ErrorActionPreference = 'Stop'
$fonte = $PSScriptRoot
New-Item -ItemType Directory -Force -Path $Destino,(Join-Path $Destino 'temporarios') | Out-Null
$env:TEMP = Join-Path $Destino 'temporarios'
$env:TMP = $env:TEMP
$env:PYINSTALLER_CONFIG_DIR = Join-Path $Destino 'cache'
$env:PYTHONDONTWRITEBYTECODE = '1'
& $Python -m unittest discover -s $fonte
if ($LASTEXITCODE -ne 0) { throw 'Os testes falharam. A compilação foi interrompida.' }
& $Python -m PyInstaller --noconfirm --clean --onefile --windowed --name HDClientes-Local --version-file (Join-Path $fonte 'version.rc') --distpath (Join-Path $Destino 'dist') --workpath (Join-Path $Destino 'build') --specpath $Destino --paths $fonte (Join-Path $fonte 'interface.py')
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível compilar o executável.' }
Write-Output ('Executável: ' + (Join-Path $Destino 'dist\HDClientes-Local.exe'))
