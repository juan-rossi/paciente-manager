# Scaffold: arma TranscriberSetup.exe a partir del ejecutable SEA + Inno Setup.
# Requiere Inno Setup instalado (ISCC.exe en el PATH) — no verificado end-to-end
# todavía, ver LOCAL_TRANSCRIPTION_ARCHITECTURE.md.
#
# Uso: npm run build-sea ; powershell -File scripts/package-windows.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$issFile = Join-Path $root "installers/windows/transcriber.iss"

if (-not (Get-Command ISCC.exe -ErrorAction SilentlyContinue)) {
    Write-Error "ISCC.exe (Inno Setup) no está en el PATH. Instalar desde https://jrsoftware.org/isinfo.php"
    exit 1
}

ISCC.exe $issFile
Write-Host "Instalador generado en installers/windows/Output/TranscriberSetup.exe"
