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
  "allowedOrigins": ["http://localhost:3000"]
}
```

`allowedOrigins` no necesita el dominio de cada médico: cualquier origen
que matchee `https://paciente-manager*.vercel.app` (todos los entornos
dados de alta, ver `ENTORNOS.md`) **o** un subdominio de
`malvinasoftware.com` (dominio propio de la organización, usado por los
médicos que tienen su propia URL en vez de la de Vercel) se permite
automáticamente (`src/cors.ts`) — un mismo instalador/config sirve para
cualquier médico nuevo, tenga URL de Vercel o dominio propio, sin
reconfigurar nada. `allowedOrigins` queda solo para un dominio fuera de
esos dos patrones (o para desarrollo local).

El modelo (`tiny|base|small|medium`) determina qué archivo `ggml-*.bin`
(variante multilingüe) se descarga on-demand a un directorio de datos de
usuario — nunca al repo ni al instalador. `GET /health` responde
`downloading_model` mientras baja.

En el frontend, `NEXT_PUBLIC_TRANSCRIBER_URL` (opcional, default
`http://127.0.0.1:7891`) es el único punto de configuración — si no está
seteada, todo funciona igual apuntando al puerto por defecto.

## Precisión de la transcripción

Ajustes específicos para español (todos en `whisper-service/src/asr/engine.ts`),
partiendo de la base de que `language` siempre va a ser `"es"`:

- **`initial_prompt`**: whisper.cpp no lo trata como una instrucción, sino
  como si fuera transcripción previa — condiciona el estilo y el vocabulario
  de lo que sigue. Se usa un fragmento de evolución clínica real con
  medicación habitual (`enalapril, losartán, atorvastatina, metformina,
  paracetamol, ibuprofeno, amoxicilina, omeprazol, levotiroxina`, etc. —
  ver `INITIAL_PROMPT_BY_LANGUAGE` en `engine.ts`). No agrega latencia (no
  dispara reintentos), así que se usa en la pasada parcial y en la final.
  **Medido el impacto** con una frase de prueba con nombres de fármacos,
  ritmo rápido y ruido de fondo sintético: sin el prompt, "metformina" y
  "dislipemia" salían como "me formina" y "dislitenio"; con el prompt de
  medicación agregado, salieron perfectos, y "enalapril" pasó de "en ala
  priv" a "enalapri" (una letra de diferencia). Si una especialidad
  puntual usa vocabulario muy distinto (ej. oncología, psiquiatría), vale
  la pena extender esta lista con sus términos/fármacos más frecuentes.
- **`temperatureInc: 0.2`** (solo en la pasada final): si la primera pasada
  da baja confianza, reintenta con algo más de temperatura — más robusto
  ante acentos marcados o audio ruidoso. Se omite en la pasada parcial para
  no sumarle más latencia a lo que ya es lento sin GPU.
- **Resampling nativo del navegador**: el `AudioContext` se crea
  directamente a 16kHz (`new AudioContext({ sampleRate: 16000 })`) en vez
  de capturar a la tasa nativa del micrófono y resamplear a mano en el
  AudioWorklet — el resampler del navegador (basado en un filtro
  polifásico) da mejor calidad que una interpolación lineal casera,
  especialmente para consonantes y sibilantes.

Lo que **no** ayuda: más threads en CPU. Se probó explícitamente (ver
"Limitaciones conocidas" abajo) y con más threads la inferencia salió más
lenta, no más rápida — no hay ganancia de precisión ahí tampoco.

Si después de esto la precisión sigue sin ser suficiente para un caso de
uso puntual, la palanca más directa es subir `model` a `medium` en
`config.json` (más preciso, pero más lento en CPU — ver benchmarks reales
abajo).

## Rendimiento (latencia sin GPU)

Los modelos que se descargan son la variante **cuantizada a 8 bits (q8_0)**
de cada tamaño (`ggml-*-q8_0.bin`), no la original en fp16. Medido en una
notebook sin GPU (12 cores, Windows), con el mismo audio de prueba
(vocabulario médico + ruido de fondo sintético) y los mismos parámetros
(`beamSize: 5`, `temperatureInc: 0.2`, mismo `initial_prompt`):

| Modelo (final) | Tiempo | Resultado |
|---|---|---|
| `small` fp16 (sin cuantizar) | ~40s | correcto |
| `small` q5_1 | ~31s | correcto (idéntico a fp16) |
| **`small` q8_0 (el que se usa)** | **~16s** | **correcto (idéntico a fp16)** |
| `base` (cualquier variante) | ~11s | vocabulario médico mal — no confiable |

La cuantización q8_0 dio el mismo resultado exacto que la variante sin
cuantizar, en **menos de la mitad del tiempo** — por eso es la que se
descarga por defecto para los cuatro tamaños (`tiny`, `base`, `small`,
`medium`), no solo para `small`.

También se probó bajar `beamSize` de 5 a 2: **no cambió el tiempo**
(41s vs 40s) — el costo del encoder de whisper.cpp domina sobre el ancho
del beam search, así que no vale la pena tocar ese parámetro para ganar
velocidad.

Con esto, el resultado final en esta máquina baja de ~34-45s a ~15-20s.
Sigue siendo mucho más lento que "tiempo real" — es la naturaleza de correr
un modelo mediano sin GPU. Si la latencia sigue siendo un problema:
- Bajar `model` a `base` en `config.json` — mucho más rápido (~11s) pero
  ya no confiable con vocabulario médico específico (ver tabla arriba).
- Correr en una Mac con Apple Silicon (Metal) o una PC con GPU
  Vulkan/CUDA — la variante `default` que se usa hoy no las aprovecha
  (deliberadamente, para no requerirle drivers al usuario final), pero es
  la razón principal por la que el modelo `small` es viable en Apple
  Silicon y lento en un CPU de Windows sin GPU.

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

- **Párrafos de más de 30s pueden mostrar texto repetido en el corte
  automático**: `MAX_SEGMENT_MS` (30s) fuerza un "final" automático para no
  dejar crecer el buffer indefinidamente. Sin GPU, esa transcripción tarda
  ~20-25s — si el médico sigue hablando y toca "Detener" mientras tanto,
  antes ese audio nuevo se **descartaba en silencio** (bug real, encontrado
  y arreglado — ver commit correspondiente en `chunking.ts`: la condición
  `hasPendingSpeech &&` en `stop()` quedaba en `false` por el reset
  síncrono de `finalize()`, aunque hubiera audio real pendiente). Ya
  arreglado: ahora siempre se transcribe lo que quedó en el buffer al
  detener, sin importar ese flag. Lo que **sigue** siendo una aspereza
  cosmética (no pérdida de datos): como el segmento cortado a los 30s se
  solapa 1s con el que sigue, puede aparecer una frase corta repetida o
  ligeramente distinta justo en el punto de corte. Si esto molesta,
  subir `MAX_SEGMENT_MS` en `chunking.ts` reduce cuántos párrafos lo
  disparan, a costa de esperar más por el primer resultado.
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
  (`scripts/build-package.mjs`) solo copia la variante `default` al paquete
  final.
- **Sin diarización**: el campo `speaker` va siempre en `null` en esta
  versión — ver "Mejoras futuras".
- **Empaquetado de Windows verificado; macOS no**: el flujo de
  `scripts/build-package.mjs` se corrió y probó de punta a punta en Windows
  real (arranque sin consola, motor de transcripción, ícono de bandeja con
  fallback correcto si falla, auto-arranque registrado en el Registro). El
  mismo script debería funcionar igual en macOS (usa las mismas APIs de
  Node multiplataforma) pero **no se corrió nunca en una Mac real** — falta
  probarlo ahí, y falta, como mínimo, una cuenta de Apple Developer para
  firmar/notarizar antes de distribuir (sin eso, Gatekeeper bloquea la
  apertura). Ver "Empaquetado" abajo para el detalle.
- **Precisión del modelo `tiny`/`base`**: son rápidos pero transcriben peor
  que `small`/`medium`, especialmente con acentos marcados o ambiente
  ruidoso — `small` es el default recomendado como piso de calidad
  razonable para uso clínico.

## Empaquetado

### Por qué una carpeta autocontenida y no un único .exe (Node SEA)

La primera versión de este documento proponía Node "Single Executable
Application" (SEA): un solo binario con todo adentro. Se probó de verdad y
se descartó — `@fugood/whisper.node` es un addon nativo, y la resolución de
`require()`/`import()` de dependencias reales *dentro* de un blob SEA no
está bien soportada (confirmado con un error real:
`Dynamic require of "..." is not supported` en cuanto el bundle intentaba
cargar `ws`). En la práctica hacía falta un `node_modules` real en disco de
todos modos.

El enfoque actual (`scripts/build-package.mjs`) logra el mismo resultado
para el médico — nada que instalar a mano, un solo instalador — con muchas
menos sorpresas: arma una **carpeta autocontenida** con
- una copia portátil de `node.exe`/`node` (la del equipo donde se corre el
  script — no hace falta que el médico tenga Node instalado),
- la app bundleada en un solo archivo CJS (`app/server.cjs`, via esbuild;
  se usa CJS y no ESM porque `ws` rompe en el formato ESM, ver arriba),
- un `node_modules` mínimo instalado en limpio solo con lo que no se puede
  bundlear (`@fugood/whisper.node` — podando las variantes `-vulkan`/`-cuda`
  que no se usan —, `systray2`, `auto-launch`),
- `config/config.example.json`, y
- un script wrapper (`Transcriber.vbs` en Windows, `Transcriber.sh` en
  macOS) que arranca todo sin mostrar una consola.

**Importante**: corré `build-package.mjs` **en la plataforma de destino** —
los binarios nativos (whisper.cpp, el propio `node.exe` copiado) son
específicos por SO/arquitectura. Un build hecho en Windows sirve para
Windows nomás.

`src/config/loadConfig.ts` normalmente calcula la raíz del servicio en
base a su propia ubicación en el código fuente — eso deja de tener sentido
una vez bundleado en un solo archivo. Por eso los wrappers exportan
`WHISPER_SERVICE_ROOT` (la carpeta del paquete instalado) antes de arrancar
`node`, y `loadConfig.ts` la usa si está presente.

`auto-launch` (el paquete que registra el arranque automático) tiene una
limitación real: solo puede apuntar a un ejecutable, sin argumentos propios
— por eso apunta al wrapper (`Transcriber.vbs`/`.sh`), no a `node.exe`
directo, y el wrapper arma él mismo el comando completo
(`node app/server.cjs`) con `WHISPER_SERVICE_ROOT` seteado. Ese mismo
paquete además **ignora el nombre que se le pasa** y deriva el nombre que
se ve en el Registro/LaunchAgent del nombre de archivo del wrapper
(recortando ciegamente 4 caracteres asumiendo `.exe`) — por eso el wrapper
se llama justo `Transcriber.vbs`/`Transcriber.sh`: así también el nombre
derivado queda "Transcriber" en vez de un fragmento raro.

### Windows — verificado de punta a punta

1. `cd whisper-service && npm run build-package` — arma
   `dist-package/win32-x64/` (node.exe portátil + `app/server.cjs` +
   `app/node_modules` + `config/config.example.json` + `Transcriber.vbs`).
2. **Probado en la práctica, de punta a punta**: arranca sin ventana de
   consola, carga el motor de transcripción (whisper.cpp + VAD)
   correctamente desde el `node_modules` empaquetado, `GET /health`
   responde `ok`, `auto-launch` registra `HKCU\...\Run\Transcriber`
   apuntando al `.vbs`, y el ícono de bandeja (`systray2`) arranca su
   proceso nativo (`tray_windows_release.exe`) correctamente. (En el camino
   se encontró y corrigió un bug real: el `import()` dinámico de un módulo
   CJS que además exporta su propio campo `default` queda doblemente
   anidado por el interop de Node — `m.default` no es la clase, es
   `{ default: SysTray }` — ver el comentario en `src/tray/index.ts`.)
3. `scripts/package-windows.ps1` (requiere
   [Inno Setup](https://jrsoftware.org/isinfo.php) — se instala con
   `winget install --id JRSoftware.InnoSetup`, deja `ISCC.exe` en el PATH)
   compila `installers/windows/transcriber.iss` → `TranscriberSetup.exe`,
   que instala la carpeta completa (por usuario, sin pedir admin —
   `PrivilegesRequired=lowest`, típicamente en
   `%LOCALAPPDATA%\Programs\Transcriber`), agrega un acceso directo de menú
   de inicio apuntando al `.vbs` vía `wscript.exe`, y al terminar la
   instalación corre el `.vbs` una vez (el auto-arranque real lo registra
   la propia app la primera vez que corre, no el instalador — ver más
   abajo). **Probado de punta a punta con el instalador real**: se generó
   `TranscriberSetup.exe`, se corrió, y quedó instalado y funcionando como
   transcriptor real de la máquina (no una prueba descartable). En el
   camino se encontraron y corrigieron dos bugs más:
   - El `.iss` inicialmente también dejaba un acceso directo en la carpeta
     de Inicio de Windows (`{userstartup}`) además del auto-arranque que ya
     registra la app sola (Registry `Run` key vía `auto-launch`) — con las
     dos cosas activas el servicio arrancaba dos veces en cada inicio de
     sesión, y la segunda instancia fallaba. Se sacó el ícono de
     `{userstartup}` del `[Icons]`; el único auto-arranque que queda es el
     que registra la app misma.
   - Ese escenario (dos instancias arrancando, la segunda encontrando el
     puerto 7891 ya ocupado) además hacía crashear el proceso: un
     `EADDRINUSE` no manejado tira una excepción no capturada. Se agregó un
     handler `server.on("error", ...)` en `src/server.ts` que, ante
     `EADDRINUSE`, loguea un mensaje amigable ("probablemente el
     transcriptor ya está corriendo") y cierra limpio con `process.exit(0)`
     en vez de crashear — verificado arrancando una segunda instancia a
     propósito mientras la primera tenía el puerto.

### macOS — no verificado, requiere una Mac real

1. `npm run build-package` (mismo script, corrido EN una Mac) arma
   `dist-package/darwin-<arch>/`.
2. `scripts/package-macos.sh` arma `Transcriber.app`, con todo (node
   portátil, `app/`, `config/`, `Transcriber.sh`) junto en
   `Contents/MacOS/` — `Info.plist` declara `Transcriber.sh` como
   `CFBundleExecutable` y `LSUIElement: true` (sin ícono en Dock/Cmd+Tab,
   solo vive en la bandeja de menú).
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
