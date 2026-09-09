# Arquitectura de transcripción local

Transcripción de la conversación médico-paciente en (casi) tiempo real,
procesada **100% en la computadora del médico** — sin APIs pagas, sin que el
audio salga de la máquina. Se integra en el modal "Nueva evolución" de
`EvolucionTab` (`src/components/patient-form/evolucion-tab.tsx`).

## Arquitectura

```
Browser (paciente-manager, Next.js)
   │
   │ 1. GET http://127.0.0.1:7891/health          (detección de disponibilidad)
   │
   │ 2. getUserMedia() → AudioContext → AudioWorklet
   │    (public/audio/pcm-worklet.js: resamplea a PCM16 mono 16kHz)
   │
   ▼
   WebSocket ws://127.0.0.1:7891/transcribe
   │
   ▼
whisper-service/ (proceso Node/TS local, proyecto npm independiente)
   │
   ├── ws/gateway.ts     — valida Origin, upgrade del WebSocket
   ├── ws/session.ts     — una sesión por conexión
   ├── asr/chunking.ts   — VAD + ventana deslizante → decide partial/final
   └── asr/engine.ts     — @fugood/whisper.node (binding N-API de whisper.cpp)
                            + modelo ggml local (tiny/base/small/medium)
   │
   ▼
{"type":"partial"|"final", "text": "..."}
   │
   ▼
Browser: use-transcription.ts → Textarea de "Nueva evolución"
```

`whisper-service/` es un proyecto npm independiente (su propio
`package.json`/`tsconfig.json`), hermano de `src/` en el mismo repo, pero
nunca importado desde la app Next.js ni desplegado a Vercel — corre
exclusivamente como proceso local en la máquina del médico. Ver su
[README](whisper-service/README.md) para instrucciones de desarrollo.

## Flujo de datos

1. Al entrar al detalle de un paciente (`EvolucionTab`), el hook
   `useTranscription` (`src/components/patient-form/use-transcription.ts`)
   consulta `GET /health` y muestra un `Badge`: "Transcriptor conectado" /
   "Transcriptor no detectado". Se vuelve a consultar al abrir el modal
   "Nueva evolución".
2. Al presionar "Iniciar transcripción": el navegador pide permiso de
   micrófono (`getUserMedia`), arma un `AudioContext` + `AudioWorkletNode`
   (`public/audio/pcm-worklet.js`) que resamplea el audio del micrófono (a
   su tasa nativa, típicamente 44.1/48kHz) a **PCM 16-bit mono 16kHz** — el
   formato exacto que espera whisper.cpp — y lo envía en frames binarios de
   ~100ms por WebSocket.
3. `whisper-service` acumula el audio por sesión y corre un VAD (Silero,
   embebido en el binding) para saber si hay habla:
   - Mientras hay habla: cada ~1s transcribe el buffer acumulado (beam
     rápido) y emite `{"type":"partial","text":"..."}` — **reemplaza** al
     parcial anterior en la UI, no se concatena.
   - Al detectar silencio sostenido (~800ms) o llegar a un techo de ~30s
     hablando sin pausas: transcribe con beam más preciso y emite
     `{"type":"final","text":"...", "speaker": null}` — se **anexa** al
     contenido del Textarea (que sigue siendo editable a mano).
4. Al presionar "Detener transcripción" (o cerrar el modal): se cierra la
   conexión WebSocket, se libera el micrófono, y si quedaba audio sin
   procesar se fuerza una última transcripción final.

## Protocolo de comunicación

### `GET /health`

```json
{ "status": "ok" | "downloading_model" | "error", "version": "0.1.0" }
```

Se consulta antes de habilitar el botón "Iniciar transcripción". Un CORS
`Access-Control-Allow-Origin` se agrega solo si el `Origin` del request está
en `allowedOrigins`; si no, responde `403`.

### `WebSocket ws://127.0.0.1:<port>/transcribe`

- **Cliente → servidor**: frames **binarios**, PCM 16-bit mono 16kHz crudo
  (sin envoltorio/contenedor).
- **Servidor → cliente**: frames de texto JSON:
  ```json
  {"type": "partial", "text": "El paciente refiere dolor..."}
  {"type": "final", "text": "El paciente refiere dolor abdominal desde hace tres días.", "speaker": null}
  {"type": "error", "message": "..."}
  ```
- El `Origin` del handshake se valida contra `allowedOrigins` — si no
  matchea, el servidor responde `403` y destruye el socket antes de
  completar el upgrade.

Se eligió **WebSocket binario con PCM crudo** (no HTTP con chunks, no
`MediaRecorder`/webm) por dos motivos: (1) HTTP por chunks obligaría a abrir
una conexión nueva por cada bloque de audio, con más overhead y sin un canal
natural para push de resultados parciales; (2) `MediaRecorder` produce
webm/opus, que requeriría decodificarlo del lado del servicio (ffmpeg u otra
dependencia nativa) — el `AudioWorklet` resamplea en el navegador y evita
esa dependencia extra por completo.

## Endpoints y configuración

Ver [`whisper-service/README.md`](whisper-service/README.md) para el detalle
de `config.json` (modelo, idioma, puerto, `allowedOrigins`). Resumen:

```json
{
  "model": "small",
  "language": "es",
  "port": 7891,
  "allowedOrigins": ["http://localhost:3000", "https://tu-dominio.vercel.app"]
}
```

El modelo (`tiny|base|small|medium`) determina qué archivo `ggml-*.bin`
(variante multilingüe) se descarga on-demand a un directorio de datos de
usuario — nunca al repo ni al instalador. `GET /health` responde
`downloading_model` mientras baja.

En el frontend, `NEXT_PUBLIC_TRANSCRIBER_URL` (opcional, default
`http://127.0.0.1:7891`) es el único punto de configuración — si no está
seteada, todo funciona igual apuntando al puerto por defecto.

## Privacidad

- Todo el audio se procesa **en memoria**, dentro del proceso
  `whisper-service` — nunca se escribe a disco, ni siquiera temporalmente.
- El servidor escucha **únicamente en `127.0.0.1`** (loopback) — nunca en
  `0.0.0.0` ni en la IP de red del médico. No hay forma de alcanzarlo desde
  otra computadora de la red.
- No se usa ningún servicio externo de speech-to-text (nada de OpenAI
  Whisper API, Google Speech-to-Text, Azure Speech, AWS Transcribe). Toda la
  inferencia corre localmente vía whisper.cpp.
- CORS + validación de `Origin` en `/health` y en el upgrade del WebSocket
  evitan que un sitio web arbitrario (que no sea la app de Paciente Manager)
  pueda conectarse al servicio, aunque esté corriendo en la misma máquina.

## Limitaciones conocidas

- **Local Network Access (LNA) del navegador — la más importante**: desde
  Chrome 142 (octubre 2025) y Firefox (marzo 2026), los navegadores
  requieren un permiso explícito del usuario (similar al de
  cámara/micrófono) para que un sitio público HTTPS — como cualquier
  `*.vercel.app` — pueda conectarse a `127.0.0.1`/red local. Se confirmó en
  la práctica contra `https://paciente-manager.vercel.app`: sin ese
  permiso, tanto `fetch("/health")` como el WebSocket a `/transcribe` son
  bloqueados por el navegador (`net::ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`).
  El navegador debería mostrar un diálogo nativo pidiendo el permiso la
  primera vez que el médico use la función en cada perfil de navegador —
  hay que aceptarlo para que el transcriptor funcione. Si lo rechazó, o si
  el navegador nunca se lo mostró, puede revisarse/cambiarse en
  `chrome://settings/content/localNetworkAccess` (Chrome) o el equivalente
  en Firefox. **No hay forma de distinguir por código** "el médico no dio
  el permiso" de "el servicio no está corriendo" — el error de red que
  llega a JavaScript es el mismo genérico en ambos casos (`TypeError:
  Failed to fetch` / cierre de WebSocket sin detalle) — por eso los
  mensajes de la UI mencionan ambas posibilidades en vez de diagnosticar
  cuál es. Esta protección sigue evolucionando (hubo un opt-out temporal de
  Google que expira en septiembre de 2026); conviene volver a probar el
  comportamiento exacto en el momento de habilitar esto para producción.
- **Descarga de modelos sin checksum criptográfico**: se descarga por HTTPS
  desde Hugging Face y se valida que el archivo tenga un tamaño razonable
  (no truncado), pero no se verifica un hash SHA-256 exacto contra un valor
  publicado. Para un ataque de integridad se necesitaría comprometer la
  conexión HTTPS o el propio hosting de Hugging Face.
- **`@fugood/whisper.node`** es un binding de mantenimiento chico (no es el
  repo oficial `ggml-org/whisper.cpp`). Se aisló detrás de
  `whisper-service/src/asr/engine.ts` para poder reemplazarlo sin tocar el
  resto del servicio si se abandona.
- **Instalación en Windows descarga de más**: `npm install` en
  `whisper-service/` trae, además del binario `default` que realmente se
  usa, las variantes `-vulkan` y `-cuda` para la arquitectura de la máquina
  (son `optionalDependencies` del paquete, sin distinción de variante por
  parte de npm) — no se usan en runtime (nunca se pide esa variante) y no
  requieren ningún driver/toolchain instalado, pero sí ocupan espacio extra
  en `node_modules` durante desarrollo. El script de empaquetado
  (`scripts/build-sea.mjs`) solo copia la variante `default` al ejecutable
  final.
- **Sin diarización**: el campo `speaker` va siempre en `null` en esta
  versión — ver "Mejoras futuras".
- **Empaquetado no verificado de punta a punta**: `scripts/build-sea.mjs`,
  `scripts/package-windows.ps1` y `scripts/package-macos.sh` implementan el
  flujo completo (Node SEA + Inno Setup / `.app`+`.dmg`) pero no se
  generó/probó un instalador real todavía — falta, como mínimo, una cuenta
  de Apple Developer para notarizar en macOS. Ver "Empaquetado" abajo.
- **Precisión del modelo `tiny`/`base`**: son rápidos pero transcriben peor
  que `small`/`medium`, especialmente con acentos marcados o ambiente
  ruidoso — `small` es el default recomendado como piso de calidad
  razonable para uso clínico.

## Empaquetado

### Windows

1. `cd whisper-service && npm run build-sea` — bundlea con esbuild, genera
   el blob de Node SEA e inyecta un `transcriber.exe` con `postject`
   (`scripts/build-sea.mjs`).
2. Copiar junto al `.exe` el addon nativo (`node_modules/@fugood/node-whisper-win32-<arch>`,
   solo la variante `default`) y los paquetes `systray2`/`auto-launch`.
3. `scripts/package-windows.ps1` invoca Inno Setup
   (`installers/windows/transcriber.iss`) para producir
   `TranscriberSetup.exe`, que instala el ejecutable, deja
   `config/config.json` inicial (copiado de `config.example.json` si no
   existe) y registra el arranque automático vía el acceso directo en la
   carpeta de inicio de Windows.

### macOS

1. `npm run build-sea` (mismo paso, genera el binario `transcriber` para
   macOS).
2. `scripts/package-macos.sh` arma `Transcriber.app` (con
   `installers/macos/Info.plist`, `LSUIElement: true` para que no aparezca
   en el Dock — solo vive en la bandeja del menú).
3. **Pendiente antes de distribuir**: firmar con `codesign` y notarizar con
   `xcrun notarytool` — requiere una cuenta de Apple Developer ($99/año).
   Sin notarizar, Gatekeeper bloquea la apertura en Macs modernas.
4. Empaquetar en un `.dmg` (ej. `hdiutil create`).

### Auto-arranque y bandeja

`whisper-service/src/tray/index.ts` (solo se usa en el binario empaquetado,
no en `npm run dev`) muestra un ícono en la bandeja del sistema con opción
"Salir", y registra el servicio para arrancar junto con el sistema operativo
vía `auto-launch`. Si `systray2`/`auto-launch` fallan en alguna plataforma,
el servicio sigue funcionando igual desde la consola — la bandeja es una
comodidad, no una dependencia dura.

## Mejoras futuras

- **Diarización de hablantes** (médico vs. paciente): el mensaje `final` ya
  reserva el campo `speaker`. El camino más realista es correr un modelo de
  speaker-embeddings aparte sobre el mismo PCM (la variante `tinydiarize` de
  whisper.cpp es solo inglés, no sirve para español).
- **Botón "Descargar transcriptor"**: hoy es un placeholder en la UI
  (mensaje "El transcriptor local no está disponible.") — falta publicar
  los instaladores firmados y enlazarlos ahí.
- **Selección de modelo desde la UI**: hoy `config.json` se edita a mano;
  se podría exponer un endpoint de configuración + una pantalla simple en
  el tray para elegir modelo/idioma sin tocar un archivo.
- **Progreso de descarga de modelo en la UI web**: hoy solo se ve en el
  tooltip del tray y en los logs de consola del servicio; `GET /health`
  podría devolver un porcentaje para mostrarlo en el Badge del frontend.
