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
 * corre VAD para saber si hay habla, y decide cuándo emitir "partial" (mientras
 * se habla, con el modelo rápido de `engine.transcribePartial`) vs "final" (al
 * detectar silencio sostenido o al llegar a un techo de duración, con el
 * modelo configurado vía `engine.transcribeFinal`). Sin diarización ni VAD
 * incremental — el mínimo necesario para no perder texto ni trabarse.
 *
 * Nota de rendimiento: sin GPU, un solo modelo mediano/grande puede tardar
 * varios segundos (o más) por llamada — por eso el "parcial" usa siempre un
 * modelo chico y rápido (ver `engine.ts`), y por eso `busy` puede dejar
 * pasar varios ticks de reloj sin llamar de nuevo al motor: no es un bug,
 * es la forma de no encolar llamadas nativas superpuestas sobre el mismo
 * contexto de whisper.cpp.
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

        const text = await this.engine.transcribePartial(this.buffer);
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

    const text = await this.engine.transcribeFinal(segment);
    if (text) this.callbacks.onFinal(text);
  }

  /**
   * Cierra la sesión, forzando una última transcripción final si quedó audio
   * pendiente. Se llama tanto al recibir la señal de "stop" del cliente
   * (mientras el WebSocket sigue abierto, para poder mandar el resultado)
   * como al cerrarse la conexión — `closed` evita que corra dos veces.
   */
  async stop(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearInterval(this.timer);

    // Si hay una transcripción en curso (`busy`), esperamos a que termine en
    // vez de pisarla — evita dos llamadas nativas concurrentes sobre el mismo
    // contexto de whisper.cpp. Mientras se espera (puede ser bastante sin
    // GPU), `pushAudio` sigue acumulando en `this.buffer` todo lo que el
    // médico siga diciendo.
    while (this.busy) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // OJO: no condicionar esto a `this.hasPendingSpeech`. Ese flag lo resetea
    // `finalize()` de forma síncrona apenas arranca, antes de esperar el
    // resultado. Confirmado con logs: en un párrafo de más de 30s, el corte
    // automático por `MAX_SEGMENT_MS` dispara un `finalize()` que tarda
    // ~20-25s sin GPU; si el médico sigue hablando y toca "Detener" mientras
    // esa transcripción todavía está en vuelo, el flag queda en `false`
    // aunque haya audio real y nuevo en el buffer — antes ese tramo (la
    // última oración del párrafo) se descartaba acá en silencio, sin ningún
    // error. Alcanza con que haya suficiente audio, sin importar el flag.
    if (this.buffer.length >= MIN_SAMPLES_FOR_ANALYSIS) {
      try {
        const text = await this.engine.transcribeFinal(this.buffer);
        if (text) this.callbacks.onFinal(text);
      } catch (error) {
        logger.warn(`Error en la transcripción final de cierre: ${(error as Error).message}`);
      }
    }
  }
}
