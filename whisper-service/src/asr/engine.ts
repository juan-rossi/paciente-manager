import { initWhisper, initWhisperVad } from "@fugood/whisper.node";
import { ensureModel } from "../models/downloader.js";
import { WHISPER_MODELS, VAD_MODEL } from "../models/registry.js";
import type { ServiceConfig } from "../config/loadConfig.js";
import { logger } from "../logger.js";

export type AsrEngine = {
  /** Pasada rápida (modelo chico fijo) para el texto en vivo mientras se habla. */
  transcribePartial(pcm: Int16Array): Promise<string>;
  /** Pasada más precisa (modelo configurado, beam más generoso) para el resultado final. */
  transcribeFinal(pcm: Int16Array): Promise<string>;
  /** true si el buffer contiene habla detectada por el VAD. */
  detectHasSpeech(pcm: Int16Array): Promise<boolean>;
  release(): Promise<void>;
};

// Sin GPU, un modelo mediano/grande puede tardar muchos segundos por llamada
// (medido: "small" ~34s para transcribir menos de 1s de audio en una notebook
// sin GPU) — inviable para el texto parcial en vivo. "tiny" es ~4-8x más
// rápido en la misma máquina, por eso se usa siempre para el parcial,
// independientemente del modelo que el médico haya configurado para el final.
const PARTIAL_MODEL = "tiny" as const;

// El "prompt" de whisper.cpp no es una instrucción — condiciona la decodificación
// como si fuera transcripción previa, sesgando estilo y vocabulario hacia lo que
// sigue. Un fragmento de evolución clínica real en español ayuda a acertar
// términos médicos y tildes que el modelo, sin este contexto, tiende a errar.
// Sin costo de latencia (no dispara reintentos), así que se usa en ambas pasadas.
const INITIAL_PROMPT_BY_LANGUAGE: Record<string, string> = {
  es: "Evolución clínica en español. Antecedentes: hipertensión arterial, diabetes tipo 2, dislipemia, hipotiroidismo. Medicación habitual: enalapril, losartán, atorvastatina, metformina, paracetamol, ibuprofeno, amoxicilina, omeprazol, levotiroxina. El paciente refiere dolor, fiebre, cefalea y mareos. Se indica tratamiento y control en una semana.",
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
  const finalModelEntry = WHISPER_MODELS[config.model];
  const finalModelPath = await ensureModel(finalModelEntry, onModelProgress);

  const partialModelEntry = WHISPER_MODELS[PARTIAL_MODEL];
  const sameModelForBoth = config.model === PARTIAL_MODEL;
  const partialModelPath = sameModelForBoth ? finalModelPath : await ensureModel(partialModelEntry);

  const vadPath = await ensureModel(VAD_MODEL);

  logger.info(`Cargando modelo final "${config.model}" (${config.language})...`);
  // useGpu habilita Metal en Apple Silicon; en plataformas sin backend de GPU
  // compilado en la variante "default" (Windows/Linux sin Vulkan/CUDA) es un no-op
  // y cae a CPU — evitamos a propósito las variantes vulkan/cuda para no requerirle
  // drivers/toolchains adicionales al usuario final.
  const finalWhisper = await initWhisper({ filePath: finalModelPath, useGpu: true });

  let partialWhisper = finalWhisper;
  if (!sameModelForBoth) {
    logger.info(`Cargando modelo rápido "${PARTIAL_MODEL}" para texto parcial...`);
    partialWhisper = await initWhisper({ filePath: partialModelPath, useGpu: true });
  }

  const vad = await initWhisperVad({ filePath: vadPath, useGpu: true, nThreads: 2 });
  logger.info("Motor de transcripción listo.");

  const initialPrompt = INITIAL_PROMPT_BY_LANGUAGE[config.language];

  return {
    async transcribePartial(pcm) {
      const { promise } = partialWhisper.transcribeData(toArrayBuffer(pcm), {
        language: config.language,
        prompt: initialPrompt,
        temperature: 0,
      });
      const result = await promise;
      return result.result.trim();
    },
    async transcribeFinal(pcm) {
      const { promise } = finalWhisper.transcribeData(toArrayBuffer(pcm), {
        language: config.language,
        prompt: initialPrompt,
        beamSize: 5,
        temperature: 0,
        // Fallback a mayor temperatura si la primera pasada da poca confianza —
        // más robusto ante acentos marcados o audio con ruido de fondo. Solo en
        // la pasada final: en la parcial agregaría reintentos que le costarían
        // la latencia que justamente busca evitar.
        temperatureInc: 0.2,
      });
      const result = await promise;
      return result.result.trim();
    },
    async detectHasSpeech(pcm) {
      const segments = await vad.detectSpeechData(toArrayBuffer(pcm));
      return segments.length > 0;
    },
    async release() {
      await finalWhisper.release();
      if (partialWhisper !== finalWhisper) await partialWhisper.release();
      await vad.release();
    },
  };
}
