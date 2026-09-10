# whisper-service

Servicio local de transcripción de audio para Paciente Manager. Corre como
proceso auxiliar en la computadora del médico, escucha únicamente en
`127.0.0.1` y usa [whisper.cpp](https://github.com/ggml-org/whisper.cpp)
(vía [`@fugood/whisper.node`](https://www.npmjs.com/package/@fugood/whisper.node))
para transcribir en español sin enviar audio a ningún servicio externo.

Es un proyecto npm independiente del repo Next.js — no se despliega a Vercel,
no se importa desde `src/`, y tiene su propio `package.json`/`tsconfig.json`.
Ver [`LOCAL_TRANSCRIPTION_ARCHITECTURE.md`](../LOCAL_TRANSCRIPTION_ARCHITECTURE.md)
en la raíz del repo para la arquitectura completa (protocolo, privacidad,
empaquetado).

## Correr en desarrollo

```sh
cd whisper-service
npm install
npm run dev
```

La primera vez que arranca, descarga el modelo configurado (por defecto
`small`, variante cuantizada q8_0, ~264MB) a un directorio de datos de
usuario — no al repo — y puede tardar varios minutos según la conexión.
`GET http://127.0.0.1:7891/health` responde `{"status":"downloading_model"}`
mientras tanto, y `{"status":"ok"}` cuando ya puede transcribir.

## Configuración

Copiá `config/config.example.json` a `config/config.json` (gitignored) para
personalizar sin tocar el ejemplo versionado:

```json
{
  "model": "small",
  "language": "es",
  "port": 7891,
  "allowedOrigins": ["http://localhost:3000", "https://tu-dominio.vercel.app"]
}
```

- `model`: `tiny | base | small | medium` — más grande = más preciso y más
  lento. Cambiar el archivo y reiniciar el servicio alcanza.
- `allowedOrigins`: dominios desde los que el navegador puede llamar a este
  servicio (CORS + validación de `Origin` en el WebSocket). Agregar acá el
  dominio `*.vercel.app` de cada médico nuevo (ver `ENTORNOS.md` en la raíz).

## Requisitos

Ninguno para el usuario final más allá de instalar el ejecutable empaquetado
(cuando exista, ver limitaciones abajo). Para desarrollo: Node.js 20+.

## Empaquetado (Windows/macOS)

El scaffold está en `scripts/build-sea.mjs` (Node Single Executable
Application) + `scripts/package-windows.ps1` (Inno Setup) +
`scripts/package-macos.sh` (`.app`/`.dmg`). **No están verificados de punta a
punta todavía** — requieren, como mínimo, una cuenta de Apple Developer para
notarizar en macOS. Ver la sección "Empaquetado" de
`LOCAL_TRANSCRIPTION_ARCHITECTURE.md` para el detalle y los pasos pendientes.

## Estructura

```
src/
├── server.ts        # bootstrap: config, motor ASR, HTTP + WebSocket
├── http/health.ts    # GET /health
├── ws/               # gateway (upgrade + CORS) y sesión por conexión
├── asr/              # engine.ts (wrapper de whisper.cpp) y chunking.ts (VAD + ventana deslizante)
├── models/           # registry de modelos + descarga on-demand
├── config/           # config.json validado con zod
└── tray/             # ícono de bandeja + auto-arranque (solo para el build empaquetado)
```
