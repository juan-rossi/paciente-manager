import { useCallback, useEffect, useRef, useState } from "react";
import { TRANSCRIBER_URL, useTranscriberConnection, type ConnectionStatus } from "@/lib/transcriber";

const TRANSCRIBER_WS_URL = `${TRANSCRIBER_URL.replace(/^http/, "ws")}/transcribe`;

export type { ConnectionStatus };
export type RecordingStatus = "idle" | "conectando" | "grabando" | "finalizando" | "error";
export type TranscriptionErrorKind = "mic_denegado" | "servicio_no_disponible" | "conexion_perdida";

type PartialMessage = { type: "partial"; text: string };
type FinalMessage = { type: "final"; text: string; speaker: null };
type IncomingMessage = PartialMessage | FinalMessage | { type: "error"; message: string };

function parseMessage(raw: string): IncomingMessage | null {
  try {
    const data = JSON.parse(raw);
    if (data && (data.type === "partial" || data.type === "final" || data.type === "error")) {
      return data as IncomingMessage;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Captura de mic + transcripción vía el servicio local de whisper.cpp
 * (ver LOCAL_TRANSCRIPTION_ARCHITECTURE.md). El texto "final" de cada segmento
 * se entrega por callback (`iniciar(onFinal)`) para que quien use el hook lo
 * anexe a su propio estado editable — este hook no es dueño del contenido final,
 * solo del ciclo de vida de la grabación y del texto parcial en vivo.
 */
export function useTranscription() {
  const { status: connectionStatus, reintentar: checkConnection } = useTranscriberConnection();
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [partialText, setPartialText] = useState("");
  const [error, setError] = useState<TranscriptionErrorKind | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const onFinalRef = useRef<(text: string) => void>(() => {});
  const recordingStartRef = useRef<number>(0);

  // Cuenta los segundos desde que arrancó a grabar (no desde que se pidió
  // permiso de mic) — se recalcula desde `Date.now()` en vez de incrementar
  // un contador para no acumular desvío si el intervalo se retrasa.
  useEffect(() => {
    if (recordingStatus !== "grabando") return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - recordingStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [recordingStatus]);

  // Libera el micrófono/AudioContext/worklet, pero NO toca el WebSocket — se
  // usa desde `detener()`, que necesita mantenerlo abierto un rato más (ver
  // más abajo) para no perder la transcripción final.
  const stopCapture = useCallback(() => {
    workletNodeRef.current?.port.close();
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
  }, []);

  // Cierre "duro": además de liberar mic/audio, fuerza el cierre del
  // WebSocket ya mismo. Se usa al desmontar el componente o cuando falló
  // algo antes de llegar a grabar — no cuando el usuario detiene una
  // grabación en curso (ver `detener`).
  const cleanup = useCallback(() => {
    stopCapture();
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
  }, [stopCapture]);

  const detener = useCallback(() => {
    const worklet = workletNodeRef.current;
    const ws = wsRef.current;

    const finishStop = () => {
      stopCapture();
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Sin GPU, la transcripción final puede tardar varios segundos (a veces
        // bastante más) — mandamos una señal de "stop" y dejamos que el propio
        // servicio cierre la conexión después de mandar el resultado, en vez de
        // cerrarla nosotros ya mismo y perderlo (ver LOCAL_TRANSCRIPTION_ARCHITECTURE.md).
        setRecordingStatus("finalizando");
        ws.send(JSON.stringify({ type: "stop" }));
      } else {
        // Todavía conectando (o ya cerrado): abortamos en vez de dejarlo colgado.
        ws?.close();
        wsRef.current = null;
        setRecordingStatus("idle");
        setPartialText("");
      }
    };

    if (!worklet) {
      finishStop();
      return;
    }

    // El worklet solo manda audio al servidor cada ~100ms (ver
    // pcm-worklet.js). Si desconectáramos ya mismo, lo que haya grabado
    // desde el último envío — el final de la frase que el médico acaba de
    // decir — se perdería en silencio. Le pedimos que lo mande ahora y
    // esperamos su confirmación (con un timeout de resguardo) antes de
    // desconectar el mic y avisarle al servicio que pare.
    let done = false;
    const finishOnce = () => {
      if (done) return;
      done = true;
      clearTimeout(safetyTimer);
      finishStop();
    };
    worklet.port.onmessage = (event) => {
      if (event.data?.type === "flushed") {
        finishOnce();
        return;
      }
      if (ws?.readyState === WebSocket.OPEN) ws.send(event.data);
    };
    const safetyTimer = setTimeout(finishOnce, 500);
    worklet.port.postMessage({ type: "flush" });
  }, [stopCapture]);

  const iniciar = useCallback(
    async (onFinal: (text: string) => void) => {
      onFinalRef.current = onFinal;
      setError(null);
      setRecordingStatus("conectando");

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        setError("mic_denegado");
        setRecordingStatus("error");
        return;
      }
      streamRef.current = stream;

      const ws = new WebSocket(TRANSCRIBER_WS_URL);
      wsRef.current = ws;

      const opened = await new Promise<boolean>((resolve) => {
        ws.addEventListener("open", () => resolve(true), { once: true });
        ws.addEventListener("error", () => resolve(false), { once: true });
      });

      if (!opened) {
        setError("servicio_no_disponible");
        setRecordingStatus("error");
        cleanup();
        return;
      }

      ws.onmessage = (event) => {
        const message = parseMessage(event.data as string);
        if (!message) return;
        if (message.type === "partial") {
          setPartialText(message.text);
        } else if (message.type === "final") {
          setPartialText("");
          onFinalRef.current(message.text);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setRecordingStatus((current) => {
          // "finalizando": el cierre es el final esperado del flujo de
          // `detener()` (el servidor cierra después de mandar el resultado
          // pendiente) — no es un error.
          if (current === "finalizando") return "idle";
          if (current !== "grabando") return current;
          setError("conexion_perdida");
          return "error";
        });
      };

      try {
        // Pedimos el AudioContext directamente a 16kHz (la tasa que espera
        // whisper.cpp) en vez de resamplear a mano en el worklet: el
        // resampler nativo del navegador da mejor calidad que una
        // interpolación lineal casera, sobre todo para consonantes/sibilantes
        // — importante para la precisión de la transcripción final.
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        await audioContext.audioWorklet.addModule("/audio/pcm-worklet.js");

        const source = audioContext.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioContext, "pcm-worklet-processor");
        workletNodeRef.current = workletNode;
        workletNode.port.onmessage = (event) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(event.data);
        };

        // Conectamos a un GainNode en 0 (en vez de directo a destination) para que
        // el navegador siga "tirando" del worklet sin reproducir el mic por los
        // parlantes.
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        source.connect(workletNode);
        workletNode.connect(silentGain);
        silentGain.connect(audioContext.destination);
      } catch {
        setError("servicio_no_disponible");
        setRecordingStatus("error");
        cleanup();
        return;
      }

      recordingStartRef.current = Date.now();
      setElapsedSeconds(0);
      setRecordingStatus("grabando");
    },
    [cleanup]
  );

  useEffect(() => cleanup, [cleanup]);

  return {
    connectionStatus,
    recordingStatus,
    partialText,
    elapsedSeconds,
    error,
    iniciar,
    detener,
    reintentarConexion: checkConnection,
  };
}
