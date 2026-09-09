import { createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ModelEntry } from "./registry.js";
import { logger } from "../logger.js";

// Directorio de datos de usuario por plataforma, separado del repo/instalación —
// sobrevive a reinstalaciones del servicio y no infla el instalador.
export function getModelsDir(): string {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
    return path.join(base, "Transcriber", "models");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Transcriber", "models");
  }
  return path.join(os.homedir(), ".config", "transcriber", "models");
}

const MAX_ATTEMPTS = 3;

function isCompleteEnough(filePath: string, approxBytes: number): boolean {
  if (!existsSync(filePath)) return false;
  const { size } = statSync(filePath);
  // Los tamaños publicados varían levemente entre revisiones del modelo — exigimos
  // solo que no esté vacío/truncado de forma obvia, no un checksum exacto (ver
  // limitaciones conocidas en LOCAL_TRANSCRIPTION_ARCHITECTURE.md).
  return size > approxBytes * 0.5;
}

export type DownloadProgress = (percent: number) => void;

export async function ensureModel(entry: ModelEntry, onProgress?: DownloadProgress): Promise<string> {
  const modelsDir = getModelsDir();
  mkdirSync(modelsDir, { recursive: true });
  const destPath = path.join(modelsDir, entry.filename);

  if (isCompleteEnough(destPath, entry.approxBytes)) {
    return destPath;
  }

  const tmpPath = `${destPath}.download`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      logger.info(`Descargando modelo ${entry.filename} (intento ${attempt}/${MAX_ATTEMPTS})...`);
      await downloadOnce(entry.url, tmpPath, entry.approxBytes, onProgress);
      renameSync(tmpPath, destPath);
      logger.info(`Modelo ${entry.filename} listo en ${destPath}`);
      return destPath;
    } catch (error) {
      lastError = error;
      logger.warn(`Falló la descarga de ${entry.filename}: ${(error as Error).message}`);
      if (existsSync(tmpPath)) unlinkSync(tmpPath);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }

  throw new Error(
    `No se pudo descargar el modelo ${entry.filename} tras ${MAX_ATTEMPTS} intentos: ${
      (lastError as Error)?.message ?? "error desconocido"
    }`
  );
}

async function downloadOnce(
  url: string,
  destPath: string,
  approxBytes: number,
  onProgress?: DownloadProgress
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status} al descargar ${url}`);
  }

  const total = Number(response.headers.get("content-length")) || approxBytes;
  let downloaded = 0;
  let lastReportedPercent = -1;

  const progressStream = new (await import("node:stream")).Transform({
    transform(chunk, _encoding, callback) {
      downloaded += chunk.length;
      const percent = Math.min(100, Math.round((downloaded / total) * 100));
      if (percent !== lastReportedPercent) {
        lastReportedPercent = percent;
        onProgress?.(percent);
      }
      callback(null, chunk);
    },
  });

  await pipeline(Readable.fromWeb(response.body as never), progressStream, createWriteStream(destPath));
}
