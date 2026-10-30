$ErrorActionPreference = 'Stop'
$installRoot=$PSScriptRoot
if (Test-Path -LiteralPath (Join-Path $installRoot 'outputs/PrismaImagem/PrismaImagem.exe')) {$installRoot=Join-Path $installRoot 'outputs/PrismaImagem'}
$python=Join-Path $installRoot 'engines/ComfyUI_windows_portable/python_embeded/python.exe'
if (!(Test-Path -LiteralPath $python)) {throw 'Instale o motor local primeiro com setup-local.ps1.'}
$tools=Join-Path $installRoot 'runtime/image-tools'
$models=Join-Path $installRoot 'data/background-models'
$cache=Join-Path $installRoot 'data/pip-cache'
New-Item -ItemType Directory -Force -Path $tools,$models,$cache | Out-Null
Write-Host 'Instalando recorte local em pasta separada, sem alterar os pacotes do ComfyUI.'
& $python -m pip install --target $tools --cache-dir $cache 'rembg[cpu]==2.0.67'
if ($LASTEXITCODE -ne 0) {throw 'Falha ao instalar a ferramenta de recorte.'}
$env:U2NET_HOME=$models
$env:NUMBA_CACHE_DIR=Join-Path $installRoot 'data/numba-cache'
& $python -B -s (Join-Path $installRoot 'app/background-worker.py') --install
if ($LASTEXITCODE -ne 0) {throw 'Não foi possível preparar o modelo de remoção de fundo.'}
Write-Host 'Remoção de fundo instalada. Reabra o aplicativo e selecione Remover fundo.'
