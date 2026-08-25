"use client";

import { useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EvolucionValue } from "./types";

function sortByFechaAsc(evoluciones: EvolucionValue[]) {
  return [...evoluciones].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

type Props = {
  patientId?: string;
  evoluciones: EvolucionValue[];
  onChangeEvoluciones: (next: EvolucionValue[]) => void;
};

export function EvolucionTab({ patientId, evoluciones, onChangeEvoluciones }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [contenido, setContenido] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isEditing = editingIndex !== null;

  function resetForm() {
    setFecha(new Date().toISOString().slice(0, 10));
    setContenido("");
    setError(null);
    setEditingIndex(null);
  }

  function openAddDialog() {
    resetForm();
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
        if (!response.ok) {
          setError("No se pudo eliminar la evolución.");
          return;
        }
      } finally {
        setDeleting(false);
      }
    }
    onChangeEvoluciones(evoluciones.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null);
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
                  {new Date(entry.fecha).toLocaleDateString("es-AR")}
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

      <div className="flex justify-end">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) resetForm();
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
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Observación</Label>
                <Textarea
                  ref={textareaRef}
                  rows={10}
                  className="min-h-[15rem]"
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  placeholder="Escribí la evolución del paciente..."
                />
              </div>
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
            <DialogDescription>
              Esta acción no se puede deshacer. ¿Confirmás que querés eliminar esta evolución?
            </DialogDescription>
          </DialogHeader>
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
