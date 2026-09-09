import { initWhisper, initWhisperVad } from "@fugood/whisper.node";
import { ensureModel } from "../models/downloader.js";
import { WHISPER_MODELS, VAD_MODEL } from "../models/registry.js";
import type { ServiceConfig } from "../config/loadConfig.js";
import { logger } from "../logger.js";

export type AsrEngine = {
  /** Transcribe un buffer PCM16/mono/16kHz. `beamSize` mayor = más preciso y más lento. */
  transcribePcm(pcm: Int16Array, opts: { beamSize?: number }): Promise<string>;
  /** true si el buffer contiene habla detectada por el VAD. */
  detectHasSpeech(pcm: Int16Array): Promise<boolean>;
  release(): Promise<void>;
};

function toArrayBuffer(pcm: Int16Array): ArrayBuffer {
  // whisper.node espera un ArrayBuffer propio — copiamos el rango relevante para no
  // depender del buffer subyacente del Int16Array, que puede ser compartido/reusado.
  return pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer;
}

export async function createAsrEngine(
  config: ServiceConfig,
  onModelProgress?: (percent: number) => void
): Promise<AsrEngine> {
  const modelEntry = WHISPER_MODELS[config.model];
  const modelPath = await ensureModel(modelEntry, onModelProgress);
  const vadPath = await ensureModel(VAD_MODEL);

  logger.info(`Cargando modelo whisper "${config.model}" (${config.language})...`);
  // useGpu habilita Metal en Apple Silicon; en plataformas sin backend de GPU
  // compilado en la variante "default" (Windows/Linux sin Vulkan/CUDA) es un no-op
  // y cae a CPU — evitamos a propósito las variantes vulkan/cuda para no requerirle
  // drivers/toolchains adicionales al usuario final.
  const whisper = await initWhisper({ filePath: modelPath, useGpu: true });
  const vad = await initWhisperVad({ filePath: vadPath, useGpu: true, nThreads: 2 });
  logger.info("Motor de transcripción listo.");

  return {
    async transcribePcm(pcm, opts) {
      const { promise } = whisper.transcribeData(toArrayBuffer(pcm), {
        language: config.language,
        beamSize: opts.beamSize,
        temperature: 0,
      });
      const result = await promise;
      return result.result.trim();
    },
    async detectHasSpeech(pcm) {
      const segments = await vad.detectSpeechData(toArrayBuffer(pcm));
      return segments.length > 0;
    },
    async release() {
      await whisper.release();
      await vad.release();
    },
  };
}
