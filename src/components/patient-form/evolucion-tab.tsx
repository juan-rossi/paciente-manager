"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type Props = {
  patientId?: string;
  evoluciones: EvolucionValue[];
  onChangeEvoluciones: (next: EvolucionValue[]) => void;
};

export function EvolucionTab({ patientId, evoluciones, onChangeEvoluciones }: Props) {
  const [open, setOpen] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [contenido, setContenido] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setFecha(new Date().toISOString().slice(0, 10));
    setContenido("");
    setError(null);
  }

  async function handleAgregar() {
    if (!contenido.trim()) return;
    setError(null);

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
        onChangeEvoluciones([
          { id: data.evolucion.id, fecha: data.evolucion.fecha.slice(0, 10), contenido: data.evolucion.contenido },
          ...evoluciones,
        ]);
        setOpen(false);
        resetForm();
      } finally {
        setSaving(false);
      }
    } else {
      onChangeEvoluciones([{ fecha, contenido }, ...evoluciones]);
      setOpen(false);
      resetForm();
    }
  }

  async function handleEliminar(entry: EvolucionValue, index: number) {
    if (patientId && entry.id) {
      const response = await fetch(`/api/patients/${patientId}/evoluciones/${entry.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError("No se pudo eliminar la evolución.");
        return;
      }
    }
    onChangeEvoluciones(evoluciones.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) resetForm();
          }}
        >
          <Button type="button" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nueva evolución
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva evolución</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Observación</Label>
                <Textarea
                  rows={4}
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  placeholder="Escribí la evolución del paciente..."
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleAgregar}
                disabled={saving || !contenido.trim()}
              >
                {saving ? "Agregando..." : "Agregar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4">
        {evoluciones.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay evoluciones cargadas.</p>
        )}
        {evoluciones.map((entry, index) => (
          <Card key={entry.id ?? `local-${index}`} className="relative">
            <button
              type="button"
              onClick={() => handleEliminar(entry, index)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
              aria-label="Eliminar evolución"
            >
              ✕
            </button>
            <CardContent className="flex flex-col gap-2 pt-6">
              <span className="text-sm font-medium">
                {new Date(entry.fecha).toLocaleDateString("es-AR")}
              </span>
              <p className="whitespace-pre-wrap text-sm">{entry.contenido}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
