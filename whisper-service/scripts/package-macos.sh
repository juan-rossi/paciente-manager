#!/usr/bin/env bash
# Scaffold: arma Transcriber.app + Transcriber.dmg a partir del ejecutable SEA.
# No verificado end-to-end todavía (falta firma/notarización con cuenta de Apple
# Developer) — ver LOCAL_TRANSCRIPTION_ARCHITECTURE.md, sección "Empaquetado".
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/dist-sea/Transcriber.app"
CONTENTS="$APP_DIR/Contents"

rm -rf "$APP_DIR"
mkdir -p "$CONTENTS/MacOS" "$CONTENTS/Resources"

cp "$ROOT/installers/macos/Info.plist" "$CONTENTS/Info.plist"
cp "$ROOT/dist-sea/transcriber" "$CONTENTS/MacOS/transcriber"
chmod +x "$CONTENTS/MacOS/transcriber"

echo "App sin firmar en $APP_DIR"
echo "Pendiente: codesign --deep --force --sign \"Developer ID Application: <tu equipo>\" \"$APP_DIR\""
echo "Pendiente: xcrun notarytool submit ... (requiere cuenta de Apple Developer)"
echo "Pendiente: empaquetar en .dmg (ej. con 'hdiutil create')"
