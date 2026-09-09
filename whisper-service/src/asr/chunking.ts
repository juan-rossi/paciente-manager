import type { AsrEngine } from "./engine.js";
import { logger } from "../logger.js";

const SAMPLE_RATE = 16000;
const TICK_MS = 1000;
const SILENCE_MS = 800;
const MAX_SEGMENT_MS = 30_000;
const OVERLAP_MS = 1000;
const MIN_SAMPLES_FOR_ANALYSIS = Math.round(SAMPLE_RATE * 0.3);

function msToSamples(ms: number): number {
  return Math.round((ms / 1000) * SAMPLE_RATE);
}

export type SessionCallbacks = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: Error) => void;
};

/**
 * Una sesión = una consulta médico-paciente en curso. Acumula PCM16 mono 16kHz,
 * corre VAD para saber si hay habla, y decide cuándo emitir "partial" (cada ~1s
 * mientras se habla) vs "final" (al detectar silencio sostenido o al llegar a un
 * techo de duración). Deliberadamente simple: un solo modelo, dos pasadas con
 * distinto beamSize — sin diarización ni motores duales.
 */
export class TranscriptionSession {
  private buffer: Int16Array = new Int16Array(0);
  private silenceSince: number | null = null;
  private hasPendingSpeech = false;
  private busy = false;
  private closed = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly engine: AsrEngine,
    private readonly callbacks: SessionCallbacks
  ) {}

  start(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, TICK_MS);
  }

  pushAudio(chunk: Int16Array): void {
    if (this.closed) return;
    const merged = new Int16Array(this.buffer.length + chunk.length);
    merged.set(this.buffer, 0);
    merged.set(chunk, this.buffer.length);
    this.buffer = merged;
  }

  private appendSilenceGrace(): boolean {
    if (this.silenceSince === null) {
      this.silenceSince = Date.now();
      return false;
    }
    return Date.now() - this.silenceSince >= SILENCE_MS;
  }

  private async tick(): Promise<void> {
    if (this.busy || this.closed) return;
    if (this.buffer.length < MIN_SAMPLES_FOR_ANALYSIS) return;

    this.busy = true;
    try {
      const forcedByDuration = this.buffer.length >= msToSamples(MAX_SEGMENT_MS);
      const hasSpeech = forcedByDuration ? true : await this.engine.detectHasSpeech(this.buffer);

      if (hasSpeech) {
        this.silenceSince = null;
        this.hasPendingSpeech = true;

        if (forcedByDuration) {
          await this.finalize();
          return;
        }

        const text = await this.engine.transcribePcm(this.buffer, {});
        if (text) this.callbacks.onPartial(text);
        return;
      }

      if (this.hasPendingSpeech && this.appendSilenceGrace()) {
        await this.finalize();
      }
    } catch (error) {
      this.callbacks.onError(error as Error);
    } finally {
      this.busy = false;
    }
  }

  private async finalize(): Promise<void> {
    const segment = this.buffer;
    const overlapSamples = msToSamples(OVERLAP_MS);
    this.buffer = segment.slice(Math.max(0, segment.length - overlapSamples));
    this.silenceSince = null;
    this.hasPendingSpeech = false;

    const text = await this.engine.transcribePcm(segment, { beamSize: 5 });
    if (text) this.callbacks.onFinal(text);
  }

  /** Cierra la sesión, forzando una última transcripción final si quedó audio pendiente. */
  async stop(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearInterval(this.timer);

    if (this.hasPendingSpeech && this.buffer.length >= MIN_SAMPLES_FOR_ANALYSIS) {
      try {
        const text = await this.engine.transcribePcm(this.buffer, { beamSize: 5 });
        if (text) this.callbacks.onFinal(text);
      } catch (error) {
        logger.warn(`Error en la transcripción final de cierre: ${(error as Error).message}`);
      }
    }
  }
}
