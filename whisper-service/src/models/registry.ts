import type { WhisperModel } from "../config/loadConfig.js";

export type ModelEntry = {
  filename: string;
  url: string;
  /** Tamaño aproximado en bytes, solo para mostrar progreso — no es un valor exacto. */
  approxBytes: number;
};

// Variante multilingüe (no ".en") de cada tamaño, requerida para transcribir en español.
// Fuente: https://github.com/ggml-org/whisper.cpp/blob/master/models/README.md
export const WHISPER_MODELS: Record<WhisperModel, ModelEntry> = {
  tiny: {
    filename: "ggml-tiny.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
    approxBytes: 75_000_000,
  },
  base: {
    filename: "ggml-base.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
    approxBytes: 142_000_000,
  },
  small: {
    filename: "ggml-small.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
    approxBytes: 466_000_000,
  },
  medium: {
    filename: "ggml-medium.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
    approxBytes: 1_500_000_000,
  },
};

// Modelo de VAD (Silero), separado de los modelos de transcripción — se usa para
// detectar habla/silencio y decidir cuándo emitir un resultado "final".
export const VAD_MODEL: ModelEntry = {
  filename: "ggml-silero-v6.2.0.bin",
  url: "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin",
  approxBytes: 3_000_000,
};
