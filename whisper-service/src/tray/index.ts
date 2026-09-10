/**
 * Ícono de bandeja + auto-arranque para el binario empaquetado.
 *
 * NO se usa en `npm run dev` — en desarrollo el servicio corre como proceso de
 * consola normal (ver `src/server.ts`). Este módulo lo usa `packaged-main.ts`,
 * el punto de entrada del build empaquetado (`scripts/build-package.mjs`):
 * muestra un ícono en la bandeja del sistema con opción para salir, y
 * registra el auto-arranque con el sistema operativo.
 *
 * Se mantiene aislado de `server.ts` a propósito: si `systray2`/`auto-launch`
 * fallan en alguna plataforma, el servicio sigue funcionando igual desde la
 * consola — la bandeja es una comodidad, no una dependencia dura.
 */
import path from "node:path";
import AutoLaunch from "auto-launch";
import { serviceState } from "../state.js";
import { logger } from "../logger.js";

const APP_NAME = "Transcriber";

// `auto-launch` solo puede registrar UN path ejecutable, sin argumentos — no
// alcanza para "node.exe app/server.cjs". Por eso el instalador deja un
// script wrapper (`Transcriber.vbs`/`Transcriber.sh`, generados por
// `scripts/build-package.mjs`) que arma esa línea de comando él solo; acá
// apuntamos el auto-arranque a ESE wrapper, no al binario de node directo.
//
// Ojo: a pesar del `name` que le pasamos más abajo, `auto-launch` IGNORA ese
// valor y deriva el nombre que se ve en el Registro/LaunchAgent del nombre
// de archivo del `path` (recortando ciegamente los últimos 4 caracteres,
// asumiendo ".exe") — por eso el wrapper se llama justo "Transcriber.vbs"/
// "Transcriber.sh": así el nombre derivado también queda "Transcriber".
function resolveLauncherPath(): string {
  const serviceRoot = process.env.WHISPER_SERVICE_ROOT;
  if (!serviceRoot) return process.execPath;
  if (process.platform === "win32") return path.join(serviceRoot, "Transcriber.vbs");
  if (process.platform === "darwin") return path.join(serviceRoot, "Transcriber.sh");
  return process.execPath;
}

export async function setupAutoLaunch(): Promise<void> {
  try {
    const autoLaunch = new AutoLaunch({
      name: APP_NAME,
      path: resolveLauncherPath(),
      mac: { useLaunchAgent: true },
    });
    const enabled = await autoLaunch.isEnabled();
    if (!enabled) await autoLaunch.enable();
  } catch (error) {
    logger.warn(`No se pudo configurar el auto-arranque: ${(error as Error).message}`);
  }
}

export async function setupTrayIcon(): Promise<void> {
  try {
    // Import dinámico en vez de un `import` estático o `createRequire`: así
    // funciona igual en desarrollo (tsx, ESM) y en el build empaquetado
    // (bundle CJS, donde `import.meta.url` queda vacío y rompería
    // `createRequire`) — Node soporta `import()` dinámico desde cualquiera
    // de los dos formatos.
    //
    // `systray2` es CJS y además exporta su propio campo `default` — el
    // interop de Node para `import()` de un módulo CJS SIEMPRE expone
    // `module.exports` completo como el default del namespace ESM, así que
    // acá queda doblemente anidado: `m.default` es `{ default: SysTray }`,
    // no la clase directamente. Confirmado corriendo
    // `import('systray2').then(m => console.log(m))` a mano.
    const systray2Module = (await import("systray2")) as unknown as {
      default: { default: typeof import("systray2").default };
    };
    const SysTray = systray2Module.default.default;
    const tray = new SysTray({
      menu: {
        // icon: base64 de un ícono .ico/.png — se completa al armar el instalador.
        icon: "",
        title: APP_NAME,
        tooltip: `${APP_NAME}: ${serviceState.status}`,
        items: [
          { title: "Salir", tooltip: "Detener el transcriptor", checked: false, enabled: true },
        ],
      },
    });

    tray.onClick((action) => {
      if (action.seq_id === 0) {
        void tray.kill();
        process.exit(0);
      }
    });
  } catch (error) {
    logger.warn(`No se pudo mostrar el ícono de bandeja: ${(error as Error).message}`);
  }
}
