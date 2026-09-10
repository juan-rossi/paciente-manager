#!/usr/bin/env node
/**
 * Empaqueta el servicio como una carpeta autocontenida — Node.js portátil +
 * la app bundleada + node_modules con solo lo necesario en runtime — para no
 * depender de que el médico tenga Node.js instalado.
 *
 * Se descartó el enfoque de Node SEA (single-file): `@fugood/whisper.node`
 * es un addon nativo, y la resolución de `require()`/`import()` para
 * dependencias reales dentro de un blob SEA no está bien soportada — en la
 * práctica hacía falta un `node_modules` real en disco de todos modos. Esta
 * carpeta logra lo mismo (nada que instalar a mano) con muchas menos
 * sorpresas: es básicamente una app de Node normal, con su propio Node.js
 * "portátil" al lado.
 *
 * IMPORTANTE: corré esto EN la plataforma de destino — los binarios nativos
 * (whisper.cpp, el propio node.exe que se copia) son específicos por
 * SO/arquitectura, así que un build hecho en Windows sirve para Windows
 * nomás, y lo mismo para macOS.
 *
 *   node scripts/build-package.mjs
 */
import { execFileSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const platform = process.platform;
const arch = process.arch;

if (platform !== "win32" && platform !== "darwin") {
  throw new Error(`Plataforma no soportada para empaquetar: ${platform} (solo win32/darwin)`);
}

const pkgVersion = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf-8")).version;
const OUT_DIR = path.join(ROOT, "dist-package", `${platform}-${arch}`);
const APP_DIR = path.join(OUT_DIR, "app");
const DEPS_STAGE_DIR = path.join(ROOT, "dist-package", ".deps-stage");

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(APP_DIR, { recursive: true });

console.log("[1/5] Bundling con esbuild...");
// Formato CJS, no ESM: `ws` (dependencia de `server.ts`) hace `require()` de
// módulos built-in de Node internamente, y el bundle ESM de esbuild los
// transforma en un shim que Node rechaza en runtime ("Dynamic require of ...
// is not supported"). Confirmado corriendo el bundle real — con CJS anda
// directo, sin shims raros, porque `require` ya es nativo en ese formato.
await esbuild.build({
  entryPoints: [path.join(ROOT, "src", "packaged-main.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  outfile: path.join(APP_DIR, "server.cjs"),
  // El addon nativo y los paquetes de bandeja/auto-arranque necesitan un
  // node_modules real al lado (ver paso 2) — esbuild no puede empaquetar un
  // .node binario dentro del bundle.
  external: ["@fugood/whisper.node", "systray2", "auto-launch"],
});

console.log("[2/5] Instalando en limpio las dependencias nativas para esta plataforma...");
rmSync(DEPS_STAGE_DIR, { recursive: true, force: true });
mkdirSync(DEPS_STAGE_DIR, { recursive: true });
writeFileSync(
  path.join(DEPS_STAGE_DIR, "package.json"),
  JSON.stringify(
    {
      name: "whisper-service-runtime-deps",
      private: true,
      dependencies: {
        "@fugood/whisper.node": "1.1.3",
        systray2: "2.1.4",
        "auto-launch": "5.0.6",
      },
    },
    null,
    2
  )
);
execFileSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], {
  cwd: DEPS_STAGE_DIR,
  stdio: "inherit",
  shell: platform === "win32",
});

console.log("[3/5] Podando variantes de whisper.node que no usamos (vulkan/cuda)...");
const fugoodDir = path.join(DEPS_STAGE_DIR, "node_modules", "@fugood");
if (existsSync(fugoodDir)) {
  for (const entry of readdirSync(fugoodDir)) {
    if (/-(vulkan|cuda)$/.test(entry)) {
      rmSync(path.join(fugoodDir, entry), { recursive: true, force: true });
    }
  }
}

console.log("[4/5] Copiando node_modules, config y package.json al paquete...");
cpSync(path.join(DEPS_STAGE_DIR, "node_modules"), path.join(APP_DIR, "node_modules"), { recursive: true });
mkdirSync(path.join(OUT_DIR, "config"), { recursive: true });
cpSync(path.join(ROOT, "config", "config.example.json"), path.join(OUT_DIR, "config", "config.example.json"));
// `http/health.ts` lee la versión de acá — no hace falta el package.json real
// completo, solo que tenga el campo `version`.
writeFileSync(path.join(OUT_DIR, "package.json"), JSON.stringify({ name: "whisper-service", version: pkgVersion }, null, 2));

console.log("[5/5] Copiando runtime de Node.js (el de esta máquina, portátil)...");
const nodeExeName = platform === "win32" ? "node.exe" : "node";
cpSync(process.execPath, path.join(OUT_DIR, nodeExeName));

if (platform === "win32") {
  cpSync(path.join(ROOT, "installers", "windows", "Transcriber.vbs"), path.join(OUT_DIR, "Transcriber.vbs"));
} else {
  const launchShPath = path.join(OUT_DIR, "Transcriber.sh");
  cpSync(path.join(ROOT, "installers", "macos", "Transcriber.sh"), launchShPath);
  chmodSync(launchShPath, 0o755);
  chmodSync(path.join(OUT_DIR, nodeExeName), 0o755);
}

console.log(`\nListo: ${OUT_DIR}`);
console.log("Siguiente paso: scripts/package-windows.ps1 (Windows) o scripts/package-macos.sh (macOS).");
