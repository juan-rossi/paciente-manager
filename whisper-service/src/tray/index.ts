/**
 * Ícono de bandeja + auto-arranque para el binario empaquetado (SEA).
 *
 * NO se usa en `npm run dev` — en desarrollo el servicio corre como proceso de
 * consola normal (ver `src/server.ts`). Este módulo es el punto de entrada que
 * usará el instalador (`scripts/build-sea.mjs`) una vez empaquetado: muestra un
 * ícono en la bandeja del sistema con el estado del servicio y una opción para
 * salir, y registra el auto-arranque con el sistema operativo.
 *
 * Se mantiene aislado de `server.ts` a propósito: si `systray2`/`auto-launch`
 * fallan en alguna plataforma, el servicio sigue funcionando igual desde la
 * consola — la bandeja es una comodidad, no una dependencia dura.
 */
import { createRequire } from "node:module";
import AutoLaunch from "auto-launch";
import { serviceState } from "../state.js";
import { logger } from "../logger.js";

// `systray2` es un módulo CJS cuyo default export es una clase — bajo
// module/moduleResolution "NodeNext" (proyecto ESM) TypeScript no puede
// tipar `new SysTray(...)` a través de un `import` normal (ver
// https://github.com/microsoft/TypeScript/issues/54593). `createRequire` +
// cast explícito es el workaround estándar para este caso.
const require = createRequire(import.meta.url);
const SysTray = require("systray2") as typeof import("systray2").default;

const APP_NAME = "Transcriber";

export async function setupAutoLaunch(): Promise<void> {
  try {
    const autoLaunch = new AutoLaunch({ name: APP_NAME, path: process.execPath });
    const enabled = await autoLaunch.isEnabled();
    if (!enabled) await autoLaunch.enable();
  } catch (error) {
    logger.warn(`No se pudo configurar el auto-arranque: ${(error as Error).message}`);
  }
}

export function setupTrayIcon(): void {
  try {
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
