// AudioWorklet que resamplea el micrófono (a la tasa nativa del dispositivo,
// típicamente 44.1/48kHz) a PCM16 mono 16kHz — el formato que espera whisper.cpp.
// Se resamplea acá, en el navegador, para no depender de ffmpeg/decoders en el
// servicio local (ver LOCAL_TRANSCRIPTION_ARCHITECTURE.md).
class PcmWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.ratio = sampleRate / this.targetSampleRate;
    this.fracPos = 0;
    this.carry = new Float32Array(0);
    this.pending = [];
    // ~100ms por mensaje: suficiente para no saturar postMessage, poco para no
    // agregar latencia perceptible.
    this.chunkSamples = 1600;
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

    const combined = new Float32Array(this.carry.length + channelData.length);
    combined.set(this.carry, 0);
    combined.set(channelData, this.carry.length);

    let pos = this.fracPos;
    while (true) {
      const idx = Math.floor(pos);
      if (idx + 1 >= combined.length) {
        this.carry = combined.slice(idx);
        this.fracPos = pos - idx;
        break;
      }
      const frac = pos - idx;
      this.pending.push(combined[idx] * (1 - frac) + combined[idx + 1] * frac);
      pos += this.ratio;
    }

    if (this.pending.length >= this.chunkSamples) this.flush();
    return true;
  }
}

registerProcessor("pcm-worklet-processor", PcmWorkletProcessor);
