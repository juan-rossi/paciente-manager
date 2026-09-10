"use client";

import { useCallback, useEffect, useRef } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTranscription } from "./use-transcription";

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type Props = {
  label: string;
  helpText?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
  invalid?: boolean;
};

// Como en `EvolucionTab`, pero para un campo de texto suelto del formulario en
// vez de un diálogo de agregar/editar: un botón de mic (solo ícono,
// habilitado únicamente si el transcriptor local está conectado) que dicta
// directamente sobre este textarea, con la misma UI de grabando/temporizador/
// terminando de transcribir.
export function TranscribableTextAreaField({
  label,
  helpText,
  value,
  onChange,
  rows = 4,
  required,
  invalid,
}: Props) {
  const transcription = useTranscription();

  // `onFinalRef` dentro de `useTranscription` guarda este callback una sola
  // vez, al llamar `iniciar()` -- si tomara `value` directo por closure,
  // un segundo segmento "final" en la misma grabación anexaría sobre un
  // valor viejo. Por eso se lee del ref, que sí queda al día en cada render.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleTextoFinal = useCallback(
    (texto: string) => {
      const prev = valueRef.current;
      onChange(prev.trim() ? `${prev.trim()}\n${texto}` : texto);
    },
    [onChange]
  );

  const isRecording =
    transcription.recordingStatus === "grabando" || transcription.recordingStatus === "conectando";
  const micDisabled =
    transcription.connectionStatus !== "disponible" ||
    transcription.recordingStatus === "finalizando";
  const minHeight = `${rows * 1.75}rem`;

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{required ? `${label} *` : label}</Label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={micDisabled}
          aria-label={isRecording ? "Detener transcripción" : "Iniciar transcripción"}
          title={
            transcription.connectionStatus !== "disponible"
              ? "El transcriptor local no está conectado (ver Configuración → Transcriptor)"
              : isRecording
                ? "Detener transcripción"
                : "Iniciar transcripción"
          }
          onClick={() =>
            isRecording ? transcription.detener() : void transcription.iniciar(handleTextoFinal)
          }
          className="absolute top-2 right-2 z-10 bg-background"
        >
          {isRecording ? (
            <Square className="size-3.5 text-destructive" fill="currentColor" />
          ) : (
            <Mic className="size-3.5" />
          )}
        </Button>

        {transcription.recordingStatus === "conectando" && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-md border p-4 text-center"
            style={{ minHeight }}
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Conectando con el micrófono…</p>
          </div>
        )}
        {transcription.recordingStatus === "grabando" && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-md border p-4 text-center"
            style={{ minHeight }}
          >
            <Badge variant="destructive">
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              Grabando…
            </Badge>
            <span className="font-mono text-2xl tabular-nums">
              {formatElapsed(transcription.elapsedSeconds)}
            </span>
            {transcription.partialText && (
              <p className="text-sm text-muted-foreground italic">{transcription.partialText}</p>
            )}
          </div>
        )}
        {transcription.recordingStatus === "finalizando" && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-md border p-4 text-center"
            style={{ minHeight }}
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <strong>Terminando de transcribir</strong>
              <br />
              El resultado va a aparecer acá en unos segundos.
            </p>
          </div>
        )}
        {(transcription.recordingStatus === "idle" || transcription.recordingStatus === "error") && (
          <Textarea
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn("pr-10", invalid ? "border-destructive" : undefined)}
          />
        )}
      </div>

      {transcription.error === "mic_denegado" && (
        <p className="text-sm text-destructive">
          No se pudo acceder al micrófono. Revisá los permisos del navegador para este sitio.
        </p>
      )}
      {transcription.error === "servicio_no_disponible" && (
        <p className="text-sm text-destructive">
          No se pudo conectar con el transcriptor local. Confirmá que esté corriendo.
        </p>
      )}
      {transcription.error === "conexion_perdida" && (
        <p className="text-sm text-destructive">
          Se perdió la conexión con el transcriptor. Podés reintentar.
        </p>
      )}
    </div>
  );
}
