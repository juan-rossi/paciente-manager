"use client";

import { useRef, useState } from "react";
import { ChevronDown, Loader2, Mic, MicOff, Pencil, Plus, Trash2 } from "lucide-react";
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
import { useTranscription } from "./use-transcription";
import { DateInput } from "./date-input";
import { formatDateParamBA } from "@/lib/timezone";

function sortByFechaAsc(evoluciones: EvolucionValue[]) {
  return [...evoluciones].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
};

export function EvolucionTab({
  patientId,
  evoluciones,
  onChangeEvoluciones,
  evolucionesEliminadas = [],
  onChangeEvolucionesEliminadas,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [fecha, setFecha] = useState(todayLocal());
  const [contenido, setContenido] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const transcription = useTranscription();

  const isEditing = editingIndex !== null;

  function resetForm() {
    setFecha(todayLocal());
    setContenido("");
    setError(null);
    setEditingIndex(null);
  }

  function handleTextoFinal(texto: string) {
    setContenido((prev) => (prev.trim() ? `${prev.trim()}\n${texto}` : texto));
  }

  function openAddDialog() {
    resetForm();
    void transcription.reintentarConexion();
    setOpen(true);
  }

  function openEditDialog(entry: EvolucionValue, index: number) {
    setEditingIndex(index);
    setFecha(entry.fecha);
    setContenido(entry.contenido);
    setError(null);
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
            body: JSON.stringify({ fecha, contenido }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error ?? "No se pudo editar la evolución.");
            return;
          }
          onChangeEvoluciones(
            sortByFechaAsc(
              evoluciones.map((e, i) =>
                i === editingIndex
                  ? { id: data.evolucion.id, fecha: data.evolucion.fecha.slice(0, 10), contenido: data.evolucion.contenido }
                  : e
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
          sortByFechaAsc(evoluciones.map((e, i) => (i === editingIndex ? { ...e, fecha, contenido } : e)))
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
          body: JSON.stringify({ fecha, contenido }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "No se pudo agregar la evolución.");
          return;
        }
        onChangeEvoluciones(
          sortByFechaAsc([
            ...evoluciones,
            { id: data.evolucion.id, fecha: data.evolucion.fecha.slice(0, 10), contenido: data.evolucion.contenido },
          ])
        );
        setOpen(false);
        resetForm();
      } finally {
        setSaving(false);
      }
    } else {
      onChangeEvoluciones(sortByFechaAsc([...evoluciones, { fecha, contenido }]));
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
          {
            id: data.evolucion.id,
            fecha: data.evolucion.fecha.slice(0, 10),
            contenido: data.evolucion.contenido,
            deletedAt: data.evolucion.deletedAt,
          },
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
          {
            id: data.evolucion.id,
            fecha: data.evolucion.fecha.slice(0, 10),
            contenido: data.evolucion.contenido,
          },
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
              transcription.detener();
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
                <div className="flex items-center justify-between gap-3">
                  <Label>Observación</Label>
                  {!isEditing && transcription.connectionStatus === "disponible" && (
                    <div className="flex items-center gap-2">
                      {transcription.recordingStatus === "grabando" ||
                      transcription.recordingStatus === "conectando" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => transcription.detener()}
                        >
                          <MicOff className="size-3.5" />
                          Detener transcripción
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={transcription.recordingStatus === "finalizando"}
                          onClick={() => void transcription.iniciar(handleTextoFinal)}
                        >
                          <Mic className="size-3.5" />
                          Iniciar transcripción
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {!isEditing && transcription.recordingStatus === "conectando" && (
                  <div className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-md border p-6 text-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Conectando con el micrófono…</p>
                  </div>
                )}
                {!isEditing && transcription.recordingStatus === "grabando" && (
                  <div className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-md border p-6 text-center">
                    <Badge variant="destructive">
                      <span className="size-1.5 animate-pulse rounded-full bg-current" />
                      Grabando…
                    </Badge>
                    <span className="font-mono text-3xl tabular-nums">
                      {formatElapsed(transcription.elapsedSeconds)}
                    </span>
                    {transcription.partialText && (
                      <p className="text-sm text-muted-foreground italic">{transcription.partialText}</p>
                    )}
                  </div>
                )}
                {!isEditing && transcription.recordingStatus === "finalizando" && (
                  <div className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-md border p-6 text-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      <strong>Terminando de transcribir</strong> 
                      <br></br>
                      El resultado va a aparecer acá en unos segundos.
                    </p>
                  </div>
                )}
                {(isEditing ||
                  transcription.recordingStatus === "idle" ||
                  transcription.recordingStatus === "error") && (
                  <Textarea
                    ref={textareaRef}
                    rows={10}
                    className="min-h-[15rem]"
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    placeholder="Escribí la evolución del paciente o presioná «Iniciar transcripción»..."
                  />
                )}
              </div>
              {!isEditing && transcription.connectionStatus === "no_disponible" && (
                <p className="text-sm text-muted-foreground">
                  El transcriptor local no está disponible. Si ya lo instalaste y está corriendo,
                  puede que el navegador te haya pedido permiso para acceder a la red local (un aviso
                  como el del micrófono) — si lo rechazaste o nunca lo viste, revisá los permisos del
                  sitio en la configuración del navegador. Para instalarlo o ver su estado, entrá a{" "}
                  <strong>Configuración → Transcriptor</strong>.
                </p>
              )}
              {transcription.error === "mic_denegado" && (
                <p className="text-sm text-destructive">
                  No se pudo acceder al micrófono. Revisá los permisos del navegador para este sitio.
                </p>
              )}
              {transcription.error === "servicio_no_disponible" && (
                <p className="text-sm text-destructive">
                  No se pudo conectar con el transcriptor local. Confirmá que esté corriendo, o que el
                  navegador no haya bloqueado el acceso a la red local para este sitio.
                </p>
              )}
              {transcription.error === "conexion_perdida" && (
                <p className="text-sm text-destructive">
                  Se perdió la conexión con el transcriptor. Podés reintentar.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleGuardar} disabled={saving || !contenido.trim()}>
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
