/**
 * Punto de entrada del binario empaquetado (Windows/macOS) — a diferencia de
 * `server.ts` (usado por `npm run dev`), acá además se registra el
 * auto-arranque con el sistema operativo y se muestra el ícono de bandeja.
 * Ver `scripts/build-package.mjs`.
 */
import { setupAutoLaunch, setupTrayIcon } from "./tray/index.js";
import "./server.js";

void setupAutoLaunch();
void setupTrayIcon();
