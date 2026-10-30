$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$releasePath = Join-Path $projectRoot 'outputs/PrismaImagem'
$compilerPath = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$nodePath = (Get-Command node -ErrorAction Stop).Source
New-Item -ItemType Directory -Force -Path $releasePath, (Join-Path $releasePath 'app/public'), (Join-Path $releasePath 'runtime') | Out-Null
& $compilerPath /nologo /target:winexe /platform:x64 /optimize+ /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Security.dll /reference:System.Web.Extensions.dll "/out:$releasePath/PrismaImagem.exe" (Join-Path $projectRoot 'desktop/Launcher.cs') (Join-Path $projectRoot 'desktop/Studio.cs') (Join-Path $projectRoot 'desktop/SelectionEditor.cs')
if ($LASTEXITCODE -ne 0) { throw 'Falha ao compilar o aplicativo.' }
Copy-Item -LiteralPath $nodePath -Destination (Join-Path $releasePath 'runtime/node.exe')
foreach ($item in @('desktop.mjs','server.mjs','local-provider.mjs','background-provider.mjs','background-worker.py')) { Copy-Item -LiteralPath (Join-Path $projectRoot $item) -Destination (Join-Path $releasePath 'app') }
foreach ($item in @('index.html','app.js','style.css')) { Copy-Item -LiteralPath (Join-Path $projectRoot "public/$item") -Destination (Join-Path $releasePath 'app/public') }
Copy-Item -LiteralPath (Join-Path $projectRoot 'desktop/LEIA-ME.txt') -Destination $releasePath
foreach ($item in @('setup-local.ps1','setup-background.ps1','API-LOCAL.md','GUIA-ESTUDIO.md')) { Copy-Item -LiteralPath (Join-Path $projectRoot $item) -Destination $releasePath }
Copy-Item -LiteralPath (Join-Path $projectRoot 'desktop/NODE-LICENSE.txt') -Destination (Join-Path $releasePath 'runtime/LICENSE.txt')
$zipPath = Join-Path $projectRoot 'outputs/PrismaImagem-Windows-x64.zip'
# Explicit allowlist: never package user credentials, data, .env or pending files.
$packageItems = @((Join-Path $releasePath 'PrismaImagem.exe'),(Join-Path $releasePath 'app'),(Join-Path $releasePath 'runtime'),(Join-Path $releasePath 'LEIA-ME.txt'),(Join-Path $releasePath 'setup-local.ps1'),(Join-Path $releasePath 'setup-background.ps1'),(Join-Path $releasePath 'API-LOCAL.md'),(Join-Path $releasePath 'GUIA-ESTUDIO.md'))
Compress-Archive -LiteralPath $packageItems -DestinationPath $zipPath -Force
Write-Output "Pacote pronto: $zipPath"
