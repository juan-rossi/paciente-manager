"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Gasto = {
  id: string;
  fecha: string; // ISO
  descripcion: string;
  monto: number;
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function formatMonto(monto: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(
    monto
  );
}

function todayParam() {
  return new Date().toISOString().slice(0, 10);
}

function fechaParam(iso: string) {
  return iso.slice(0, 10);
}

function sortByFechaDesc(gastos: Gasto[]) {
  return [...gastos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export function GastosScreen({ initialGastos }: { initialGastos: Gasto[] }) {
  const [gastos, setGastos] = useState<Gasto[]>(initialGastos);

  const [open, setOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [fecha, setFecha] = useState(todayParam());
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Gasto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const total = gastos.reduce((sum, g) => sum + g.monto, 0);

  function openNuevo() {
    setEditingGasto(null);
    setFecha(todayParam());
    setDescripcion("");
    setMonto("");
    setError(null);
    setOpen(true);
  }

  function openEditar(gasto: Gasto) {
    setEditingGasto(gasto);
    setFecha(fechaParam(gasto.fecha));
    setDescripcion(gasto.descripcion);
    setMonto(String(gasto.monto));
    setError(null);
    setOpen(true);
  }

  async function handleGuardar() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(
        editingGasto ? `/api/admin/gastos/${editingGasto.id}` : "/api/admin/gastos",
        {
          method: editingGasto ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fecha, descripcion, monto }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el gasto.");
        return;
      }
      setGastos((prev) =>
        sortByFechaDesc(
          editingGasto
            ? prev.map((g) => (g.id === data.gasto.id ? data.gasto : g))
            : [...prev, data.gasto]
        )
      );
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/admin/gastos/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        setDeleteError(data.error ?? "No se pudo eliminar el gasto.");
        return;
      }
      setGastos((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold">Gastos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {gastos.length} gasto{gastos.length === 1 ? "" : "s"} registrado{gastos.length === 1 ? "" : "s"} ·{" "}
            {formatMonto(total)} en total
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button type="button" onClick={openNuevo}>
            <Plus className="size-4" />
            Nuevo gasto
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGasto ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Descripción</Label>
                <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Hosting Vercel" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Monto (ARS)</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleGuardar} disabled={saving}>
                {saving
                  ? editingGasto
                    ? "Guardando..."
                    : "Agregando..."
                  : editingGasto
                    ? "Guardar"
                    : "Agregar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descripción</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {gastos.length === 0 && (
            <TableRow className="bg-white">
              <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                Todavía no registraste ningún gasto.
              </TableCell>
            </TableRow>
          )}
          {gastos.map((g) => (
            <TableRow key={g.id} className="bg-white">
              <TableCell className="font-medium">{g.descripcion}</TableCell>
              <TableCell className="text-muted-foreground">{formatFecha(g.fecha)}</TableCell>
              <TableCell className="text-right">{formatMonto(g.monto)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => openEditar(g)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Editar gasto"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(g);
                      setDeleteError(null);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Eliminar gasto"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar gasto</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <p className="text-sm text-muted-foreground">
              Se eliminará <strong>{deleteTarget.descripcion}</strong> ({formatMonto(deleteTarget.monto)},{" "}
              {formatFecha(deleteTarget.fecha)}).
            </p>
          )}
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleEliminar} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
