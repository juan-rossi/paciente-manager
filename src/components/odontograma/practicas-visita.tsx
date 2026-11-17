"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CARA_LABELS, type Cara } from "@/lib/odontograma";
import type { PracticaCatalogo, PracticaVisita } from "@/lib/practica-odontologica";
import { PracticaPickerDialog } from "./practica-picker-dialog";

type Props = {
  patientId: string;
  // null = la visita todavía no se guardó (no hay dónde colgar las prácticas).
  odontogramaId: string | null;
  // Ej. "Visita 2 · 16/11/2026", para el subtítulo del modal.
  visitaLabel: string;
  practicas: PracticaVisita[];
  onChange: (actualizar: (prev: PracticaVisita[]) => PracticaVisita[]) => void;
};

function describirCaras(caras: Cara[]) {
  return caras.map((c) => CARA_LABELS[c]).join(", ");
}

export function PracticasVisita({ patientId, odontogramaId, visitaLabel, practicas, onChange }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState<PracticaVisita | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/patients/${patientId}/odontogramas/${odontogramaId}/practicas`;

  async function agregar(
    practica: PracticaCatalogo,
    pieza: string | null,
    caras: Cara[]
  ): Promise<string | null> {
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practicaId: practica.id, pieza, caras }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "No se pudo agregar la práctica.";
      // Updater: el modal puede agregar varias seguidas sin cerrarse.
      onChange((prev) => [...prev, data.practica as PracticaVisita]);
      return null;
    } catch {
      return "No se pudo conectar con el servidor.";
    }
  }

  async function eliminar() {
    if (!aEliminar) return;
    setEliminando(true);
    setError(null);
    try {
      const res = await fetch(`${base}/${aEliminar.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo eliminar la práctica.");
        return;
      }
      const id = aEliminar.id;
      onChange((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEliminando(false);
      setAEliminar(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-semibold">Prácticas realizadas</h4>
          {odontogramaId && (
            <span className="text-xs text-muted-foreground tabular-nums">{practicas.length}</span>
          )}
        </div>
        {odontogramaId && (
          <Button type="button" variant="outline" size="sm" onClick={() => setModalAbierto(true)}>
            <Plus className="size-4" />
            Agregar práctica
          </Button>
        )}
      </div>

      {!odontogramaId ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
          Guardá la visita para cargar las prácticas del nomenclador que se realizaron.
        </p>
      ) : practicas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
          Todavía no hay prácticas en esta visita. Usá &ldquo;Agregar práctica&rdquo; para buscarlas en el
          nomenclador por código o descripción.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Práctica</th>
                <th className="px-3 py-2 font-medium">Pieza</th>
                <th className="px-3 py-2 font-medium">Caras</th>
                <th className="w-10 px-2 py-2">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {practicas.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 align-top font-mono text-xs whitespace-nowrap tabular-nums">
                    {p.codigo}
                  </td>
                  <td className="px-3 py-2 align-top">{p.descripcion}</td>
                  <td className="px-3 py-2 align-top whitespace-nowrap tabular-nums">
                    {p.pieza ?? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Boca completa
                      </span>
                    )}
                  </td>
                  <td
                    className="px-3 py-2 align-top font-mono text-xs whitespace-nowrap"
                    title={p.caras.length > 0 ? describirCaras(p.caras) : undefined}
                  >
                    {p.caras.length > 0 ? p.caras.join(" ") : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right align-top">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Eliminar ${p.codigo} ${p.descripcion}`}
                      title="Eliminar"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setAEliminar(p)}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {odontogramaId && (
        <PracticaPickerDialog
          open={modalAbierto}
          onOpenChange={setModalAbierto}
          subtitulo={visitaLabel}
          onAgregar={agregar}
        />
      )}

      <Dialog open={aEliminar !== null} onOpenChange={(o) => !o && !eliminando && setAEliminar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar práctica</DialogTitle>
            <DialogDescription>
              {aEliminar && (
                <>
                  <span className="font-mono">{aEliminar.codigo}</span> {aEliminar.descripcion}
                  {aEliminar.pieza ? ` · pieza ${aEliminar.pieza}` : " · boca completa"}. Queda
                  registrada en el historial de auditoría.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAEliminar(null)} disabled={eliminando}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={eliminar} disabled={eliminando}>
              {eliminando && <Loader2 className="size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
