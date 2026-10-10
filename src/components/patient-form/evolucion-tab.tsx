"use client";

import { useRef, useState } from "react";
import { ChevronDown, Loader2, Mic, MicOff, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EvolucionValue } from "./types";
import { formatFechaCorta, formatFechaRelativa } from "./utils";
import { useCloudTranscription } from "./use-cloud-transcription";
import { useResumenIA } from "./use-resumen-ia";
import { DictadoCompleto } from "./dictado-completo";
import { anexarTexto, formatElapsed, mensajeErrorDictado } from "./dictado-utils";
import { DateInput } from "./date-input";
import { formatDateParamBA } from "@/lib/timezone";

function sortByFechaAsc(evoluciones: EvolucionValue[]) {
  return [...evoluciones].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Lo que devuelve la API para una evolución -> el valor que usa el formulario.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evolucionFromApi(e: any): EvolucionValue {
  return {
    id: e.id,
    fecha: e.fecha.slice(0, 10),
    contenido: e.contenido,
    contenidoDictado: e.contenidoDictado ?? null,
  };
}

// `new Date().toISOString()` da la fecha en UTC, y los componentes LOCALES
// del proceso tampoco sirven: en producción (Vercel) el proceso corre en UTC,
// no en horario de Argentina, así que cerca de medianoche en Argentina ya
// habría caído en el día siguiente. `formatDateParamBA` no depende del TZ
// del proceso.
function todayLocal() {
  return formatDateParamBA(new Date());
}

type Props = {
  patientId?: string;
  evoluciones: EvolucionValue[];
  onChangeEvoluciones: (next: EvolucionValue[]) => void;
  evolucionesEliminadas?: EvolucionValue[];
  onChangeEvolucionesEliminadas?: (next: EvolucionValue[]) => void;
  // La transcripción es una función Premium: sin plan Premium vigente no se
  // muestra ningún control de dictado.
  transcripcionHabilitada?: boolean;
};

export function EvolucionTab({
  patientId,
  evoluciones,
  onChangeEvoluciones,
  evolucionesEliminadas = [],
  onChangeEvolucionesEliminadas,
  transcripcionHabilitada = false,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [fecha, setFecha] = useState(todayLocal());
  const [contenido, setContenido] = useState("");
  // Texto original dictado, cuando `contenido` pasó a ser un resumen de IA.
  const [dictado, setDictado] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const transcription = useCloudTranscription();
  const resumen = useResumenIA("evolucion");

  const isEditing = editingIndex !== null;
  const isRecording =
    transcription.recordingStatus === "grabando" || transcription.recordingStatus === "conectando";
  const ocupado = transcription.recordingStatus === "finalizando" || resumen.resumiendo;
  const errorDictado = mensajeErrorDictado(transcription.error, transcription.mensajeTopeIA);

  function resetForm() {
    setFecha(todayLocal());
    setContenido("");
    setDictado("");
    setError(null);
    resumen.limpiarError();
    setEditingIndex(null);
  }

  function handleTextoFinal(texto: string) {
    setContenido((prev) => anexarTexto(prev, texto));
    // Si ya se resumió, el dictado original sigue siendo el registro
    // completo: lo nuevo se suma también ahí.
    setDictado((prev) => (prev.trim() ? anexarTexto(prev, texto) : prev));
  }

  async function handleResumir() {
    // Una vez resumido, se vuelve a resumir siempre desde el dictado
    // completo, no desde un resumen previo.
    const fuente = dictado.trim() ? dictado : contenido;
    if (!fuente.trim()) return;
    const texto = await resumen.resumir(fuente);
    if (texto === null) return;
    setDictado(fuente);
    setContenido(texto);
  }

  function handleRestaurarDictado() {
    setContenido(dictado);
    setDictado("");
  }

  function openAddDialog() {
    resetForm();
    setOpen(true);
  }

  function openEditDialog(entry: EvolucionValue, index: number) {
    setEditingIndex(index);
    setFecha(entry.fecha);
    setContenido(entry.contenido);
    setDictado(entry.contenidoDictado ?? "");
    setError(null);
    resumen.limpiarError();
    setOpen(true);
  }

  async function handleGuardar() {
    if (!contenido.trim()) return;
    setError(null);

    if (isEditing) {
      const entry = evoluciones[editingIndex];
      if (patientId && entry.id) {
        setSaving(true);
        try {
          const response = await fetch(`/api/patients/${patientId}/evoluciones/${entry.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha, contenido, contenidoDictado: dictado }),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            setError(data?.error ?? "No se pudo editar la evolución.");
            return;
          }
          onChangeEvoluciones(
            sortByFechaAsc(
              evoluciones.map((e, i) =>
                i === editingIndex ? evolucionFromApi(data.evolucion) : e
              )
            )
          );
          setOpen(false);
          resetForm();
        } finally {
          setSaving(false);
        }
      } else {
        onChangeEvoluciones(
          sortByFechaAsc(
            evoluciones.map((e, i) =>
              i === editingIndex ? { ...e, fecha, contenido, contenidoDictado: dictado || null } : e
            )
          )
        );
        setOpen(false);
        resetForm();
      }
      return;
    }

    if (patientId) {
      setSaving(true);
      try {
        const response = await fetch(`/api/patients/${patientId}/evoluciones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fecha, contenido, contenidoDictado: dictado }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          setError(data?.error ?? "No se pudo agregar la evolución.");
          return;
        }
        onChangeEvoluciones(
          sortByFechaAsc([
            ...evoluciones,
            evolucionFromApi(data.evolucion),
          ])
        );
        setOpen(false);
        resetForm();
      } finally {
        setSaving(false);
      }
    } else {
      onChangeEvoluciones(
        sortByFechaAsc([...evoluciones, { fecha, contenido, contenidoDictado: dictado || null }])
      );
      setOpen(false);
      resetForm();
    }
  }

  async function handleConfirmarEliminar() {
    if (deleteIndex === null) return;
    const entry = evoluciones[deleteIndex];

    if (patientId && entry.id) {
      setDeleting(true);
      try {
        const response = await fetch(`/api/patients/${patientId}/evoluciones/${entry.id}`, {
          method: "DELETE",
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          setError("No se pudo eliminar la evolución.");
          return;
        }
        // La evolución no se destruye (Ley 26.529) -- pasa a la lista de
        // eliminadas para poder restaurarla, no desaparece sin dejar rastro.
        onChangeEvolucionesEliminadas?.([
          ...evolucionesEliminadas,
          { ...evolucionFromApi(data.evolucion), deletedAt: data.evolucion.deletedAt },
        ]);
      } finally {
        setDeleting(false);
      }
    }
    onChangeEvoluciones(evoluciones.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null);
  }

  async function handleRestaurar(entry: EvolucionValue) {
    if (!patientId || !entry.id) return;
    setRestoringId(entry.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/patients/${patientId}/evoluciones/${entry.id}/restore`,
        { method: "POST" }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError("No se pudo restaurar la evolución.");
        return;
      }
      onChangeEvolucionesEliminadas?.(evolucionesEliminadas.filter((e) => e.id !== entry.id));
      onChangeEvoluciones(
        sortByFechaAsc([
          ...evoluciones,
          evolucionFromApi(data.evolucion),
        ])
      );
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {evoluciones.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay evoluciones cargadas.</p>
        )}
        {evoluciones.map((entry, index) => (
          <Card key={entry.id ?? `local-${index}`}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold">
                  {formatFechaCorta(entry.fecha)}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({formatFechaRelativa(entry.fecha)})
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEditDialog(entry, index)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Editar evolución"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteIndex(index)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Eliminar evolución"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm">{entry.contenido}</p>
              <DictadoCompleto dictado={entry.contenidoDictado} />
            </CardContent>
          </Card>
        ))}
      </div>

      {evolucionesEliminadas.length > 0 && (
        <details className="group overflow-hidden rounded-xl border border-border/60">
          <summary className="flex cursor-pointer select-none items-center justify-between gap-2 bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground sm:px-5 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Trash2 className="size-3.5" />
              </span>
              Evoluciones eliminadas ({evolucionesEliminadas.length})
            </span>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 border-t border-border/60 p-3">
            {evolucionesEliminadas.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-muted-foreground line-through">
                      {formatFechaCorta(entry.fecha)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={restoringId === entry.id}
                      onClick={() => handleRestaurar(entry)}
                    >
                      {restoringId === entry.id ? "Restaurando..." : "Restaurar"}
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground line-through">
                    {entry.contenido}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      <div className="flex items-center justify-end gap-3">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              transcription.detener({ descartar: true });
              resetForm();
            }
            setOpen(next);
          }}
        >
          <Button type="button" onClick={openAddDialog}>
            <Plus className="size-4" />
            Nueva evolución
          </Button>
          <DialogContent className="sm:max-w-xl" initialFocus={textareaRef}>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar evolución" : "Nueva evolución"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Fecha</Label>
                <DateInput value={fecha} onChange={setFecha} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Label>Observación</Label>
                  {transcripcionHabilitada && (
                    <div className="flex items-center gap-2">
                      {isRecording ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => transcription.detener()}
                        >
                          <MicOff className="size-3.5" />
                          Detener dictado
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={ocupado}
                          onClick={() => void transcription.iniciar(handleTextoFinal)}
                        >
                          <Mic className="size-3.5" />
                          Dictar
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isRecording || ocupado || !(dictado.trim() || contenido.trim())}
                        onClick={() => void handleResumir()}
                      >
                        {resumen.resumiendo ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        {resumen.resumiendo ? "Resumiendo…" : "Resumir con IA"}
                      </Button>
                    </div>
                  )}
                </div>
                {transcription.recordingStatus === "conectando" && (
                  <div className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-md border p-6 text-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Conectando con el micrófono…</p>
                  </div>
                )}
                {transcription.recordingStatus === "grabando" && (
                  <div className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-md border p-6 text-center">
                    <Badge variant="destructive">
                      <span className="size-1.5 animate-pulse rounded-full bg-current" />
                      Grabando…
                    </Badge>
                    <span className="font-mono text-3xl tabular-nums">
                      {formatElapsed(transcription.elapsedSeconds)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      El texto aparece al detener. Máximo {transcription.maxSeconds / 60} minutos.
                    </p>
                  </div>
                )}
                {transcription.recordingStatus === "finalizando" && (
                  <div className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-md border p-6 text-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      <strong>Transcribiendo…</strong>
                      <br />
                      El resultado va a aparecer acá en unos segundos.
                    </p>
                  </div>
                )}
                {(transcription.recordingStatus === "idle" ||
                  transcription.recordingStatus === "error") && (
                  <Textarea
                    ref={textareaRef}
                    rows={10}
                    // Crece con el texto (field-sizing-content) pero con tope:
                    // pasado el 50% del alto de pantalla scrollea el textarea,
                    // así el botón de guardar nunca queda fuera del viewport.
                    className="max-h-[50dvh] min-h-[15rem] overflow-y-auto"
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    disabled={resumen.resumiendo}
                    placeholder={
                      transcripcionHabilitada
                        ? "Escribí la evolución del paciente o presioná «Dictar»..."
                        : "Escribí la evolución del paciente..."
                    }
                  />
                )}
              </div>
              {transcripcionHabilitada && (
                <DictadoCompleto dictado={dictado} onRestaurar={handleRestaurarDictado} />
              )}
              {errorDictado && <p className="text-sm text-destructive">{errorDictado}</p>}
              {resumen.error && <p className="text-sm text-destructive">{resumen.error}</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleGuardar} disabled={saving || isRecording || ocupado || !contenido.trim()}>
                {saving ? "Guardando..." : isEditing ? "Guardar" : "Agregar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={deleteIndex !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteIndex(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar evolución</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta evolución dejará de aparecer en la historia clínica. Por la Ley 26.529, el
            registro no se destruye: se conserva de forma segura.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteIndex(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmarEliminar}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
