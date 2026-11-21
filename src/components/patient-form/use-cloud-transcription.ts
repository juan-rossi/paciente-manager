import { useCallback, useEffect, useRef, useState } from "react";

export type RecordingStatus = "idle" | "conectando" | "grabando" | "finalizando" | "error";
export type TranscriptionErrorKind =
  | "mic_denegado"
  | "transcripcion_fallida"
  | "sin_conexion"
  | "tope_alcanzado";

// Mismo valor que `CODIGO_TOPE_IA` en src/lib/ia-auth.ts (ese módulo es solo
// de servidor).
const CODIGO_TOPE_IA = "tope_ia";

// Respuesta 429 de `/api/ia/*` por tope mensual alcanzado: devuelve el
// mensaje del servidor (incluye cuándo se renueva), o null si es otro error.
function mensajeTope(response: Response, data: { code?: unknown; error?: unknown } | null): string | null {
  if (response.status !== 429 || data?.code !== CODIGO_TOPE_IA) return null;
  return typeof data.error === "string" ? data.error : null;
}

// Vercel limita el body de una función a 4,5 MB: a 24 kbps, 10 minutos de
// Opus son ~1,8 MB, con margen de sobra. Por eso la grabación se parte en
// segmentos de 10 minutos que se suben por separado (mientras se sigue
// grabando) y el texto se une al final. El total permitido lo dice
// `/api/ia/disponible` (60 min para psicólogos y psiquiatras, 10 para el resto; ver
// limitesDictado() en src/lib/especialidad.ts).
const SEGMENTO_SEGUNDOS = 10 * 60;
const MAX_GRABACION_SEGUNDOS_DEFAULT = 10 * 60;
const AUDIO_BITS_PER_SECOND = 24_000;

type FallaSegmento = { error: TranscriptionErrorKind; mensajeTope: string | null };

function elegirMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  // Safari no graba webm/opus; mp4 (AAC) también lo acepta Whisper.
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) =>
    MediaRecorder.isTypeSupported(t)
  );
}

/**
 * Dictado con Whisper en la nube (Groq, vía `/api/ia/transcribir`): graba el
 * mic con MediaRecorder en segmentos de hasta 10 minutos (cada uno es un
 * archivo de audio independiente), los sube a medida que se completan y, al
 * detener, entrega el texto completo por callback (`iniciar(onFinal)`) para
 * que quien use el hook lo anexe a su propio estado editable. No hay texto
 * parcial en vivo.
 */
export function useCloudTranscription() {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [error, setError] = useState<TranscriptionErrorKind | null>(null);
  // Texto del servidor para `tope_alcanzado` (dice cuándo se renueva).
  const [mensajeTopeIA, setMensajeTopeIA] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [maxSeconds, setMaxSeconds] = useState(MAX_GRABACION_SEGUNDOS_DEFAULT);

  const streamRef = useRef<MediaStream | null>(null);
  // Segmento en curso: `terminar(true)` cierra la grabación entera, `false`
  // solo el segmento (para arrancar el siguiente).
  const segmentoRef = useRef<{ terminar: (ultimo: boolean) => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFinalRef = useRef<((texto: string) => void) | null>(null);
  // Si se cierra el diálogo mientras graba, el audio se descarta en vez de
  // subirse y escribir sobre un formulario que ya no existe.
  const descartarRef = useRef(false);
  // Subidas encadenadas: conservan el orden y permiten esperar a la última.
  const colaRef = useRef<Promise<void>>(Promise.resolve());
  const textosRef = useRef<string[]>([]);
  const fallaRef = useRef<FallaSegmento | null>(null);

  const liberarRecursos = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    segmentoRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      descartarRef.current = true;
      segmentoRef.current?.terminar(true);
      liberarRecursos();
    };
  }, [liberarRecursos]);

  // Sube un segmento y guarda su texto en `indice`. Si ya falló uno anterior
  // no se sigue gastando: el texto que sí salió se entrega igual al final.
  const subirSegmento = useCallback(async (audio: Blob, indice: number) => {
    if (fallaRef.current || descartarRef.current) return;
    try {
      const form = new FormData();
      form.append("audio", audio);
      const response = await fetch("/api/ia/transcribir", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.texto !== "string") {
        const tope = mensajeTope(response, data);
        fallaRef.current = {
          error: tope ? "tope_alcanzado" : "transcripcion_fallida",
          mensajeTope: tope,
        };
      } else {
        textosRef.current[indice] = data.texto;
      }
    } catch {
      fallaRef.current = { error: "sin_conexion", mensajeTope: null };
    }
    // Falló mientras se seguía grabando: cortar ya en vez de dejarlo dictar
    // minutos que no se van a transcribir.
    if (fallaRef.current) segmentoRef.current?.terminar(true);
  }, []);

  const finalizar = useCallback(() => {
    if (descartarRef.current) {
      textosRef.current = [];
      setRecordingStatus("idle");
      return;
    }
    const texto = textosRef.current.filter(Boolean).join(" ").trim();
    textosRef.current = [];
    if (texto) onFinalRef.current?.(texto);
    const falla = fallaRef.current;
    if (falla) {
      setMensajeTopeIA(falla.mensajeTope);
      setError(falla.error);
      setRecordingStatus("error");
      return;
    }
    setRecordingStatus("idle");
  }, []);

  const detener = useCallback(
    (opciones?: { descartar?: boolean }) => {
      descartarRef.current = Boolean(opciones?.descartar);
      if (segmentoRef.current) {
        segmentoRef.current.terminar(true);
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
      textosRef.current = [];
      fallaRef.current = null;
      colaRef.current = Promise.resolve();
      setError(null);
      setMensajeTopeIA(null);
      setElapsedSeconds(0);
      setRecordingStatus("conectando");

      // Si ya alcanzó el tope mensual, avisar antes de grabar. Cualquier otra
      // falla de este chequeo se ignora: la subida vuelve a validar todo.
      let maxTotal = MAX_GRABACION_SEGUNDOS_DEFAULT;
      try {
        const disponible = await fetch("/api/ia/disponible");
        const data = await disponible.json().catch(() => null);
        const tope = mensajeTope(disponible, data);
        if (tope) {
          setMensajeTopeIA(tope);
          setError("tope_alcanzado");
          setRecordingStatus("error");
          return;
        }
        if (typeof data?.maxSegundos === "number" && data.maxSegundos > 0) {
          maxTotal = data.maxSegundos;
        }
      } catch {
        // Sin conexión: se intenta grabar igual, con el límite por defecto.
      }
      setMaxSeconds(maxTotal);

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
      let indiceSegmento = 0;
      let inicioSegmento = Date.now();

      // Cada segmento es un MediaRecorder nuevo sobre el mismo stream: los
      // chunks de `timeslice` no son archivos válidos por sí solos (solo el
      // primero trae el encabezado del contenedor).
      const grabarSegmento = () => {
        const indice = indiceSegmento++;
        const chunks: Blob[] = [];
        let ultimo = false;
        const recorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
        });
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onstop = () => {
          if (ultimo) {
            liberarRecursos();
            if (!descartarRef.current) setRecordingStatus("finalizando");
          }
          const audio = new Blob(chunks, { type: recorder.mimeType || mimeType });
          if (audio.size > 0 && !descartarRef.current) {
            colaRef.current = colaRef.current.then(() => subirSegmento(audio, indice));
          }
          if (ultimo) colaRef.current = colaRef.current.then(finalizar);
        };
        const segmento = {
          terminar: (esUltimo: boolean) => {
            if (recorder.state !== "recording") return;
            ultimo = esUltimo;
            if (esUltimo && segmentoRef.current === segmento) segmentoRef.current = null;
            recorder.stop();
          },
        };
        segmentoRef.current = segmento;
        inicioSegmento = Date.now();
        recorder.start(1000);
      };

      grabarSegmento();
      setRecordingStatus("grabando");

      const inicio = Date.now();
      timerRef.current = setInterval(() => {
        const segmento = segmentoRef.current;
        if (!segmento) return;
        const segundos = Math.floor((Date.now() - inicio) / 1000);
        setElapsedSeconds(segundos);
        if (segundos >= maxTotal) {
          segmento.terminar(true);
        } else if ((Date.now() - inicioSegmento) / 1000 >= SEGMENTO_SEGUNDOS) {
          segmento.terminar(false);
          grabarSegmento();
        }
      }, 500);
    },
    [liberarRecursos, subirSegmento, finalizar]
  );

  return {
    recordingStatus,
    elapsedSeconds,
    maxSeconds,
    error,
    mensajeTopeIA,
    iniciar,
    detener,
  };
}
