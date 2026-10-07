"use client";

import { useCallback, useEffect, useRef } from "react";
import { Loader2, Mic, Sparkles, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DictadoCompleto } from "./dictado-completo";
import { useCloudTranscription } from "./use-cloud-transcription";
import { useResumenIA, type TipoResumen } from "./use-resumen-ia";
import { anexarTexto, formatElapsed, mensajeErrorDictado } from "./dictado-utils";

type Props = {
  label: string;
  helpText?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
  invalid?: boolean;
  // Habilita "Resumir con IA". El texto original queda en `dictado` y el
  // resumen pasa a ser el valor del campo.
  tipoResumen?: TipoResumen;
  dictado?: string;
  onDictadoChange?: (value: string) => void;
  // Función Premium: sin plan Premium vigente no se muestran los botones de
  // mic ni de IA.
  transcripcionHabilitada?: boolean;
};

// Como en `EvolucionTab`, pero para un campo de texto suelto del formulario en
// vez de un diálogo de agregar/editar: un botón de mic (solo ícono) que dicta
// directamente sobre este textarea, con la misma UI de grabando/temporizador/
// terminando de transcribir, y un botón de resumen con IA.
export function TranscribableTextAreaField({
  label,
  helpText,
  value,
  onChange,
  rows = 4,
  required,
  invalid,
  tipoResumen,
  dictado = "",
  onDictadoChange,
  transcripcionHabilitada = false,
}: Props) {
  const transcription = useCloudTranscription();
  const resumen = useResumenIA(tipoResumen ?? "antecedentes");
  const puedeResumir = transcripcionHabilitada && Boolean(tipoResumen && onDictadoChange);

  // `useCloudTranscription` guarda el callback de `iniciar()` y lo llama recién
  // al terminar de transcribir -- si tomara `value`/`dictado` directo por
  // closure, anexaría sobre valores viejos. Por eso se leen de refs.
  const valueRef = useRef(value);
  const dictadoRef = useRef(dictado);
  useEffect(() => {
    valueRef.current = value;
    dictadoRef.current = dictado;
  }, [value, dictado]);

  const handleTextoFinal = useCallback(
    (texto: string) => {
      onChange(anexarTexto(valueRef.current, texto));
      // Si ya se resumió, el dictado original sigue siendo el registro
      // completo: lo nuevo se suma también ahí.
      if (dictadoRef.current.trim()) onDictadoChange?.(anexarTexto(dictadoRef.current, texto));
    },
    [onChange, onDictadoChange]
  );

  async function handleResumir() {
    // Una vez resumido, se vuelve a resumir siempre desde el dictado
    // completo, no desde un resumen previo.
    const fuente = dictado.trim() ? dictado : value;
    if (!fuente.trim()) return;
    const texto = await resumen.resumir(fuente);
    if (texto === null) return;
    onDictadoChange?.(fuente);
    onChange(texto);
  }

  function handleRestaurar() {
    onChange(dictado);
    onDictadoChange?.("");
  }

  const isRecording =
    transcription.recordingStatus === "grabando" || transcription.recordingStatus === "conectando";
  const ocupado = transcription.recordingStatus === "finalizando" || resumen.resumiendo;
  const minHeight = `${rows * 1.75}rem`;
  const errorDictado = mensajeErrorDictado(transcription.error);

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{required ? `${label} *` : label}</Label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      <div className="relative">
        {transcripcionHabilitada && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={ocupado}
            aria-label={isRecording ? "Detener dictado" : "Dictar"}
            title={isRecording ? "Detener dictado" : "Dictar"}
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
        )}
        {puedeResumir && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={isRecording || ocupado || !(dictado.trim() || value.trim())}
            aria-label="Resumir con IA"
            title="Resumir con IA"
            onClick={() => void handleResumir()}
            className="absolute top-11 right-2 z-10 bg-background"
          >
            {resumen.resumiendo ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
          </Button>
        )}

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
            <p className="text-xs text-muted-foreground">
              El texto aparece al detener. Máximo {transcription.maxSeconds / 60} minutos.
            </p>
          </div>
        )}
        {transcription.recordingStatus === "finalizando" && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-md border p-4 text-center"
            style={{ minHeight }}
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <strong>Transcribiendo…</strong>
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
            disabled={resumen.resumiendo}
            className={cn(transcripcionHabilitada && "pr-10", invalid ? "border-destructive" : undefined)}
            style={{ minHeight }}
          />
        )}
      </div>

      {resumen.resumiendo && (
        <p className="text-sm text-muted-foreground">Resumiendo con IA…</p>
      )}
      {errorDictado && <p className="text-sm text-destructive">{errorDictado}</p>}
      {resumen.error && <p className="text-sm text-destructive">{resumen.error}</p>}

      {puedeResumir && <DictadoCompleto dictado={dictado} onRestaurar={handleRestaurar} />}
    </div>
  );
}
