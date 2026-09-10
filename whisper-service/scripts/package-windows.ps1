# Arma TranscriberSetup.exe a partir de la carpeta que generó build-package.mjs.
# Requiere Inno Setup instalado (ISCC.exe en el PATH).
#
# Uso: npm run build-package ; powershell -File scripts/package-windows.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$issFile = Join-Path $root "installers/windows/transcriber.iss"
$packageDir = Join-Path $root "dist-package/win32-x64"

if (-not (Test-Path $packageDir)) {
    Write-Error "No existe $packageDir — corré 'npm run build-package' primero."
    exit 1
}

if (-not (Get-Command ISCC.exe -ErrorAction SilentlyContinue)) {
    Write-Error "ISCC.exe (Inno Setup) no está en el PATH. Instalar desde https://jrsoftware.org/isinfo.php"
    exit 1
}

ISCC.exe $issFile
Write-Host "Instalador generado en installers/windows/Output/TranscriberSetup.exe"
