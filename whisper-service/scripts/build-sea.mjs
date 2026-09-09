#!/usr/bin/env node
/**
 * Empaqueta el servicio como un único ejecutable nativo (Node "Single Executable
 * Application") — el paso previo a armar el instalador Windows/macOS.
 *
 * ESTADO: scaffold documentado, no verificado de punta a punta todavía (ver
 * LOCAL_TRANSCRIPTION_ARCHITECTURE.md, sección "Empaquetado"). El punto delicado
 * es `@fugood/whisper.node`: es un addon nativo (.node) — esbuild no puede
 * "bundlearlo" dentro del blob SEA, así que lo dejamos como archivo externo
 * copiado junto al ejecutable final y lo cargamos por ruta relativa en runtime.
 * Antes de distribuir, correr este script en cada plataforma objetivo y probar
 * el ejecutable resultante manualmente.
 *
 * Pasos:
 *   1. Bundlear src/server.ts a un único archivo CJS con esbuild (Node SEA
 *      todavía requiere un entrypoint CommonJS estable).
 *   2. Generar el "SEA config" y el blob de preparación con el propio Node.
 *   3. Copiar el binario de `node` y "inyectarle" el blob con `postject`.
 *   4. Copiar el addon nativo (`node_modules/@fugood/node-whisper-<platform>-<arch>`)
 *      junto al ejecutable resultante.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST = path.join(ROOT, "dist-sea");
const BUNDLE_PATH = path.join(DIST, "bundle.cjs");
const SEA_CONFIG_PATH = path.join(DIST, "sea-config.json");
const SEA_BLOB_PATH = path.join(DIST, "sea-prep.blob");
const outName = process.platform === "win32" ? "transcriber.exe" : "transcriber";
const OUT_EXE_PATH = path.join(DIST, outName);

mkdirSync(DIST, { recursive: true });

console.log("[1/4] Bundling con esbuild...");
await esbuild.build({
  entryPoints: [path.join(ROOT, "src", "server.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  outfile: BUNDLE_PATH,
  // Los addons nativos y paquetes de bandeja/auto-arranque no se bundlean —
  // se resuelven en runtime desde node_modules copiado junto al ejecutable.
  external: ["@fugood/whisper.node", "systray2", "auto-launch"],
});

console.log("[2/4] Generando SEA config + blob...");
writeFileSync(
  SEA_CONFIG_PATH,
  JSON.stringify(
    {
      main: BUNDLE_PATH,
      output: SEA_BLOB_PATH,
      disableExperimentalSEAWarning: true,
    },
    null,
    2
  )
);
execFileSync(process.execPath, ["--experimental-sea-config", SEA_CONFIG_PATH], { stdio: "inherit" });

console.log("[3/4] Copiando binario de node e inyectando el blob (postject)...");
copyFileSync(process.execPath, OUT_EXE_PATH);
if (process.platform !== "win32") chmodSync(OUT_EXE_PATH, 0o755);

const postjectArgs = [
  path.join(ROOT, "node_modules", "postject", "dist", "cli.js"),
  OUT_EXE_PATH,
  "NODE_SEA_BLOB",
  SEA_BLOB_PATH,
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
];
if (process.platform === "darwin") postjectArgs.push("--macho-segment-name", "NODE_SEA");
execFileSync(process.execPath, postjectArgs, { stdio: "inherit" });

console.log(`\nListo: ${OUT_EXE_PATH}`);
console.log(
  "Pendiente antes de distribuir: copiar node_modules/@fugood/node-whisper-<platform>-<arch>, " +
    "systray2 y auto-launch junto al ejecutable, y probar que arranca sin el resto de node_modules."
);
