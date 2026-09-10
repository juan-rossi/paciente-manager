// AudioWorklet que convierte el audio del micrófono (ya capturado a 16kHz
// mono por el propio AudioContext, ver use-transcription.ts) a PCM16 — el
// formato que espera whisper.cpp. No resamplea acá: dejar que el navegador
// resamplee de la tasa nativa del dispositivo a 16kHz da mejor calidad que
// una interpolación casera, algo que importa para la precisión de la
// transcripción (especialmente en consonantes/sibilantes).
class PcmWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = [];
    // ~100ms por mensaje: suficiente para no saturar postMessage, poco para no
    // agregar latencia perceptible.
    this.chunkSamples = 1600;
    // Al detener la grabación, el lado JS pide un "flush" antes de desconectar
    // — si no, lo que haya en `pending` (hasta ~100ms, el final de lo que
    // dijo el médico) se pierde en silencio porque nunca llega a los 1600
    // samples del flush automático.
    this.port.onmessage = (event) => {
      if (event.data?.type === "flush") {
        this.flush();
        this.port.postMessage({ type: "flushed" });
      }
    };
  }

  flush() {
    if (this.pending.length === 0) return;
    const int16 = new Int16Array(this.pending.length);
    for (let i = 0; i < this.pending.length; i++) {
      const clamped = Math.max(-1, Math.min(1, this.pending[i]));
      int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
    this.pending = [];
    this.port.postMessage(int16.buffer, [int16.buffer]);
  }

  process(inputs) {
    const channelData = inputs[0]?.[0];
    if (!channelData || channelData.length === 0) return true;

    for (let i = 0; i < channelData.length; i++) this.pending.push(channelData[i]);
    if (this.pending.length >= this.chunkSamples) this.flush();
    return true;
  }
}

registerProcessor("pcm-worklet-processor", PcmWorkletProcessor);
