import { useCallback, useEffect, useRef, useState } from "react";

export type RecordingStatus = "idle" | "conectando" | "grabando" | "finalizando" | "error";
export type TranscriptionErrorKind = "mic_denegado" | "transcripcion_fallida" | "sin_conexion";

// Vercel limita el body de una función a 4,5 MB: a 24 kbps, 10 minutos de
// Opus son ~1,8 MB, con margen de sobra. Pasado ese tiempo se corta sola.
const MAX_GRABACION_SEGUNDOS = 10 * 60;
const AUDIO_BITS_PER_SECOND = 24_000;

function elegirMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  // Safari no graba webm/opus; mp4 (AAC) también lo acepta Whisper.
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) =>
    MediaRecorder.isTypeSupported(t)
  );
}

/**
 * Dictado con Whisper en la nube (Groq, vía `/api/ia/transcribir`): graba el
 * mic con MediaRecorder y, al detener, sube el audio entero y entrega el texto
 * por callback (`iniciar(onFinal)`) para que quien use el hook lo anexe a su
 * propio estado editable. No hay texto parcial en vivo.
 */
export function useCloudTranscription() {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [error, setError] = useState<TranscriptionErrorKind | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFinalRef = useRef<((texto: string) => void) | null>(null);
  // Si se cierra el diálogo mientras graba, el audio se descarta en vez de
  // subirse y escribir sobre un formulario que ya no existe.
  const descartarRef = useRef(false);

  const liberarRecursos = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      descartarRef.current = true;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      liberarRecursos();
    };
  }, [liberarRecursos]);

  const transcribir = useCallback(async (audio: Blob) => {
    setRecordingStatus("finalizando");
    try {
      const form = new FormData();
      form.append("audio", audio);
      const response = await fetch("/api/ia/transcribir", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.texto !== "string") {
        setError("transcripcion_fallida");
        setRecordingStatus("error");
        return;
      }
      if (data.texto) onFinalRef.current?.(data.texto);
      setRecordingStatus("idle");
    } catch {
      setError("sin_conexion");
      setRecordingStatus("error");
    }
  }, []);

  const detener = useCallback(
    (opciones?: { descartar?: boolean }) => {
      descartarRef.current = Boolean(opciones?.descartar);
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      } else {
        liberarRecursos();
        if (opciones?.descartar) setRecordingStatus("idle");
      }
    },
    [liberarRecursos]
  );

  const iniciar = useCallback(
    async (onFinal: (texto: string) => void) => {
      onFinalRef.current = onFinal;
      descartarRef.current = false;
      chunksRef.current = [];
      setError(null);
      setElapsedSeconds(0);
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

      const mimeType = elegirMimeType();
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        liberarRecursos();
        if (descartarRef.current) {
          setRecordingStatus("idle");
          return;
        }
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType });
        chunksRef.current = [];
        if (audio.size === 0) {
          setRecordingStatus("idle");
          return;
        }
        void transcribir(audio);
      };

      recorder.start(1000);
      setRecordingStatus("grabando");

      const inicio = Date.now();
      timerRef.current = setInterval(() => {
        const segundos = Math.floor((Date.now() - inicio) / 1000);
        setElapsedSeconds(segundos);
        if (segundos >= MAX_GRABACION_SEGUNDOS && recorder.state === "recording") {
          recorder.stop();
        }
      }, 500);
    },
    [liberarRecursos, transcribir]
  );

  return {
    recordingStatus,
    elapsedSeconds,
    maxSeconds: MAX_GRABACION_SEGUNDOS,
    error,
    iniciar,
    detener,
  };
}
