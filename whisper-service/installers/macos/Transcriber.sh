#!/bin/bash
# Arranca el servicio empaquetado. Calcula todas las rutas relativas a su
# propia ubicación (no rutas absolutas fijas) para funcionar sin importar
# dónde termine instalado. Lo invoca tanto el LaunchAgent (auto-arranque)
# como, eventualmente, un doble click manual.
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export WHISPER_SERVICE_ROOT="$DIR"
exec "$DIR/node" "$DIR/app/server.cjs"
