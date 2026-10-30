$ErrorActionPreference = 'Stop'
$installRoot = $PSScriptRoot
if (Test-Path -LiteralPath (Join-Path $installRoot 'outputs/PrismaImagem/PrismaImagem.exe')) { $installRoot = Join-Path $installRoot 'outputs/PrismaImagem' }
$engineRoot = Join-Path $installRoot 'engines'
$downloads = Join-Path $engineRoot 'downloads'
$portable = Join-Path $engineRoot 'ComfyUI_windows_portable'
New-Item -ItemType Directory -Force -Path $downloads | Out-Null
$curl = (Get-Command curl.exe -ErrorAction Stop).Source
$tar = (Get-Command tar.exe -ErrorAction Stop).Source
function Get-VerifiedFile([string]$Url, [string]$Target, [string]$Sha256) {
    if (Test-Path -LiteralPath $Target) {
        if ((Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash -eq $Sha256) { return }
        throw "O arquivo existente não corresponde ao hash esperado: $Target. Confira-o antes de tentar novamente."
    }
    $partial = $Target + '.partial'
    & $curl --fail --location --retry 3 --continue-at - --output $partial $Url
    if ($LASTEXITCODE -ne 0) { throw 'Download interrompido. Execute novamente para continuar.' }
    if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash -ne $Sha256) { throw "Hash inválido: $partial. O arquivo não será usado." }
    Move-Item -LiteralPath $partial -Destination $Target
}
Write-Host 'PrismaImagem: preparando motor local na pasta do aplicativo.'
Write-Host 'Downloads: aproximadamente 6 GB. Reserve 20 GB livres para extração.'
Write-Host 'SD 1.5 usa CreativeML Open RAIL-M; leia API-LOCAL.md.'
$archive = Join-Path $downloads 'ComfyUI-v0.43.0-nvidia-cu126.7z'
Get-VerifiedFile 'https://github.com/Comfy-Org/ComfyUI/releases/download/v0.43.0/ComfyUI_windows_portable_nvidia_cu126.7z' $archive '691dcb5295e73594c6530ff7f3fca8dbe7dfb45114b951328c5dd3df0fff6c6b'
$marker = Join-Path $engineRoot 'comfy-v0.43.0.ready'
if (!(Test-Path -LiteralPath $marker)) {
    & $tar -xf $archive -C $engineRoot
    if ($LASTEXITCODE -ne 0) { throw 'Extraia o 7z manualmente com um extrator compatível para engines, preservando ComfyUI_windows_portable. Depois execute novamente.' }
    if (!(Test-Path -LiteralPath (Join-Path $portable 'python_embeded/python.exe'))) { throw 'Python portátil não encontrado após a extração.' }
    if (!(Test-Path -LiteralPath (Join-Path $portable 'ComfyUI/main.py'))) { throw 'Motor não encontrado após a extração.' }
    Set-Content -LiteralPath $marker -Value 'v0.43.0 nvidia cu126'
}
$models = Join-Path $portable 'ComfyUI/models/checkpoints'
New-Item -ItemType Directory -Force -Path $models | Out-Null
Get-VerifiedFile 'https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors' (Join-Path $models 'v1-5-pruned-emaonly.safetensors') '6ce0161689b3853acaa03779ec93eafe75a02f4ced659bee03f50797806fa2fa'
Write-Host 'Concluído. Feche e abra PrismaImagem.exe para iniciar o motor local.'
