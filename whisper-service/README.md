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
  "allowedOrigins": ["http://localhost:3000"]
}
```

- `model`: `tiny | base | small | medium` — más grande = más preciso y más
  lento. Cambiar el archivo y reiniciar el servicio alcanza.
- `allowedOrigins`: dominios adicionales permitidos (CORS + validación de
  `Origin` en el WebSocket), además de `http://localhost:3000`. **No hace
  falta agregar el dominio de cada médico acá** — cualquier origen que
  matchee `https://paciente-manager*.vercel.app` (el patrón de todos los
  entornos dados de alta, ver `ENTORNOS.md`) **o** un subdominio de
  `malvinasoftware.com` (dominio propio de la organización) se permite
  automáticamente (`src/cors.ts`). Solo usar este campo para un dominio
  fuera de esos dos patrones.

## Requisitos

Ninguno para el usuario final más allá de instalar el paquete/instalador
(ver abajo). Para desarrollo: Node.js 20+.

## Empaquetado (Windows/macOS)

```sh
npm run build-package
```

Arma una carpeta autocontenida en `dist-package/<plataforma>-<arch>/`: una
copia portátil de Node.js + la app bundleada + un `node_modules` mínimo con
el addon nativo de whisper.cpp — nada que el médico tenga que instalar
aparte. **Corré esto EN la plataforma de destino** (los binarios nativos
son específicos por SO/arquitectura).

- **Windows**: verificado de punta a punta, incluyendo el instalador real.
  Después de `build-package`, `scripts/package-windows.ps1` (requiere
  [Inno Setup](https://jrsoftware.org/isinfo.php) — `winget install --id
  JRSoftware.InnoSetup`) arma `TranscriberSetup.exe`; se compiló, se corrió
  y quedó instalado (por usuario, sin admin) y funcionando: arranca sin
  consola, carga el motor, `/health` responde, auto-arranque se registra
  bien en el Registro y el ícono de bandeja funciona. En el camino se
  corrigieron dos bugs: un acceso directo redundante en la carpeta de
  Inicio de Windows que duplicaba el auto-arranque (sacado del `.iss`), y
  un `EADDRINUSE` no manejado que crasheaba el proceso si dos instancias
  arrancaban a la vez (ahora cierra limpio con un mensaje amigable).
- **macOS**: el script debería funcionar igual (usa las mismas APIs
  multiplataforma de Node) pero **nunca se corrió en una Mac real** —
  falta probarlo, y falta una cuenta de Apple Developer para firmar/notarizar
  antes de distribuir (`scripts/package-macos.sh`).

Ver la sección "Empaquetado" de `LOCAL_TRANSCRIPTION_ARCHITECTURE.md` para
el detalle completo (por qué no es un único .exe, cómo se resuelve la
config una vez empaquetado, limitaciones de `auto-launch`, etc.).

## Estructura

```
src/
├── server.ts          # arranca HTTP+WS (exporta startServer, lo usan dev y el build empaquetado)
├── packaged-main.ts    # entry point del build empaquetado: bandeja + auto-arranque + startServer()
├── http/health.ts      # GET /health
├── ws/                 # gateway (upgrade + CORS) y sesión por conexión
├── asr/                # engine.ts (wrapper de whisper.cpp) y chunking.ts (VAD + ventana deslizante)
├── models/             # registry de modelos + descarga on-demand
├── config/             # config.json validado con zod
└── tray/               # ícono de bandeja + auto-arranque (solo lo usa el build empaquetado)
```
