import type { WhisperModel } from "../config/loadConfig.js";

export type ModelEntry = {
  filename: string;
  url: string;
  /** Tamaño aproximado en bytes, solo para mostrar progreso — no es un valor exacto. */
  approxBytes: number;
};

// Variante multilingüe (no ".en") de cada tamaño, cuantizada a 8 bits (q8_0),
// requerida para transcribir en español. La cuantización q8_0 es la menos
// agresiva de las que ofrece whisper.cpp — medido en la práctica con "small":
// mismo resultado exacto que la variante sin cuantizar (fp16), en menos de la
// mitad del tiempo (16s vs 40s en una notebook sin GPU, con un audio de
// prueba con vocabulario médico y ruido de fondo). Fuente:
// https://github.com/ggml-org/whisper.cpp/blob/master/models/README.md
export const WHISPER_MODELS: Record<WhisperModel, ModelEntry> = {
  tiny: {
    filename: "ggml-tiny-q8_0.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q8_0.bin",
    approxBytes: 44_000_000,
  },
  base: {
    filename: "ggml-base-q8_0.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q8_0.bin",
    approxBytes: 82_000_000,
  },
  small: {
    filename: "ggml-small-q8_0.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q8_0.bin",
    approxBytes: 264_000_000,
  },
  medium: {
    filename: "ggml-medium-q8_0.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q8_0.bin",
    approxBytes: 823_000_000,
  },
};

// Modelo de VAD (Silero), separado de los modelos de transcripción — se usa para
// detectar habla/silencio y decidir cuándo emitir un resultado "final".
export const VAD_MODEL: ModelEntry = {
  filename: "ggml-silero-v6.2.0.bin",
  url: "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin",
  approxBytes: 3_000_000,
};
