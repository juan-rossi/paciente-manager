import { useCallback, useEffect, useRef, useState } from "react";

const TRANSCRIBER_URL = process.env.NEXT_PUBLIC_TRANSCRIBER_URL ?? "http://127.0.0.1:7891";
const TRANSCRIBER_WS_URL = `${TRANSCRIBER_URL.replace(/^http/, "ws")}/transcribe`;

export type ConnectionStatus = "verificando" | "disponible" | "no_disponible";
export type RecordingStatus = "idle" | "conectando" | "grabando" | "error";
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("verificando");
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [partialText, setPartialText] = useState("");
  const [error, setError] = useState<TranscriptionErrorKind | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const onFinalRef = useRef<(text: string) => void>(() => {});

  const fetchConnectionStatus = useCallback(async (): Promise<ConnectionStatus> => {
    try {
      const response = await fetch(`${TRANSCRIBER_URL}/health`, { cache: "no-store" });
      if (!response.ok) throw new Error("health no-ok");
      const data = (await response.json()) as { status?: string };
      return data.status === "error" ? "no_disponible" : "disponible";
    } catch {
      return "no_disponible";
    }
  }, []);

  const checkConnection = useCallback(() => {
    void fetchConnectionStatus().then(setConnectionStatus);
  }, [fetchConnectionStatus]);

  // Patrón "ignore flag" recomendado por React para data fetching en efectos: si
  // el componente se desmonta (o el efecto se re-ejecuta) antes de que resuelva
  // el fetch, no actualizamos un estado que ya nadie va a leer.
  useEffect(() => {
    let ignore = false;
    fetchConnectionStatus().then((status) => {
      if (!ignore) setConnectionStatus(status);
    });
    return () => {
      ignore = true;
    };
  }, [fetchConnectionStatus]);

  const cleanup = useCallback(() => {
    workletNodeRef.current?.port.close();
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
  }, []);

  const detener = useCallback(() => {
    cleanup();
    setRecordingStatus("idle");
    setPartialText("");
  }, [cleanup]);

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
        setRecordingStatus((current) => {
          if (current !== "grabando") return current;
          setError("conexion_perdida");
          return "error";
        });
      };

      try {
        const audioContext = new AudioContext();
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

      setRecordingStatus("grabando");
    },
    [cleanup]
  );

  useEffect(() => cleanup, [cleanup]);

  return {
    connectionStatus,
    recordingStatus,
    partialText,
    error,
    iniciar,
    detener,
    reintentarConexion: checkConnection,
  };
}
