#!/usr/bin/env bash
# Arma Transcriber.app a partir de la carpeta que generó build-package.mjs
# (correr primero: npm run build-package). No verificado end-to-end todavía
# — falta correrlo en una Mac real, y falta firma/notarización con cuenta de
# Apple Developer para distribuir sin que Gatekeeper lo bloquee. Ver
# LOCAL_TRANSCRIPTION_ARCHITECTURE.md, sección "Empaquetado".
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCH="$(uname -m)" # arm64 o x86_64
PACKAGE_DIR="$ROOT/dist-package/darwin-$ARCH"
APP_DIR="$ROOT/dist-package/Transcriber.app"
CONTENTS="$APP_DIR/Contents"

if [ ! -d "$PACKAGE_DIR" ]; then
  echo "No existe $PACKAGE_DIR — corré 'npm run build-package' primero." >&2
  exit 1
fi

rm -rf "$APP_DIR"
mkdir -p "$CONTENTS/MacOS"

cp "$ROOT/installers/macos/Info.plist" "$CONTENTS/Info.plist"
# Todo junto en Contents/MacOS/ (node portátil, app/, config/, Transcriber.sh) —
# Transcriber.sh calcula sus rutas relativas a su propia ubicación, así que tienen
# que quedar todas al mismo nivel que él.
cp -R "$PACKAGE_DIR"/. "$CONTENTS/MacOS/"
chmod +x "$CONTENTS/MacOS/Transcriber.sh" "$CONTENTS/MacOS/node"

echo "App sin firmar en $APP_DIR"
echo "Pendiente: codesign --deep --force --sign \"Developer ID Application: <tu equipo>\" \"$APP_DIR\""
echo "Pendiente: xcrun notarytool submit ... (requiere cuenta de Apple Developer)"
echo "Pendiente: empaquetar en .dmg (ej. con 'hdiutil create')"
