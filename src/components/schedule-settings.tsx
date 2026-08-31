"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsSection } from "@/components/settings-section";
import { DIA_SEMANA_VALUES, type DiaSemana } from "@/lib/slots";

const DIA_LABELS: Record<DiaSemana, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

type Block = {
  id: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
};

type ReprogramacionPreview = {
  turnoId: string;
  nombreYApellido: string;
  oldInicio: string;
  newInicio: string;
};

type Props = {
  initialBlocks: Block[];
  initialSlotDurationMinutes: number;
};

function formatFechaHora(iso: string) {
  const date = new Date(iso);
  const fecha = date.toLocaleDateString("es-AR");
  const hora = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${fecha} ${hora}`;
}

export function ScheduleSettings({ initialBlocks, initialSlotDurationMinutes }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(initialSlotDurationMinutes);
  const [savedDurationMinutes, setSavedDurationMinutes] = useState(initialSlotDurationMinutes);
  const [savingDuration, setSavingDuration] = useState(false);
  const [durationError, setDurationError] = useState<string | null>(null);

  const [reschedulePreview, setReschedulePreview] = useState<ReprogramacionPreview[] | null>(null);
  const [pendingDuration, setPendingDuration] = useState<number | null>(null);
  const [applyingReschedule, setApplyingReschedule] = useState(false);
  const [rescheduledCount, setRescheduledCount] = useState<number | null>(null);

  const [open, setOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [diaSemana, setDiaSemana] = useState<DiaSemana>("LUNES");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("17:00");
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Block | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleGuardarDuracion() {
    setSavingDuration(true);
    setDurationError(null);
    setRescheduledCount(null);
    try {
      const response = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotDurationMinutes }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 && data.preview) {
          setPendingDuration(slotDurationMinutes);
          setReschedulePreview(data.preview);
          return;
        }
        setDurationError(data.error ?? "No se pudo guardar la duración.");
        return;
      }
      setSavedDurationMinutes(data.slotDurationMinutes);
    } finally {
      setSavingDuration(false);
    }
  }

  async function handleConfirmarReprogramacion() {
    if (pendingDuration === null) return;
    setApplyingReschedule(true);
    setDurationError(null);
    try {
      const response = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotDurationMinutes: pendingDuration, applyReschedule: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDurationError(data.error ?? "No se pudo reprogramar los turnos.");
        return;
      }
      setSavedDurationMinutes(data.slotDurationMinutes);
      setRescheduledCount((data.rescheduled ?? []).length);
      setReschedulePreview(null);
      setPendingDuration(null);
    } finally {
      setApplyingReschedule(false);
    }
  }

  function openAddBlock() {
    setEditingBlock(null);
    setDiaSemana("LUNES");
    setHoraInicio("09:00");
    setHoraFin("17:00");
    setBlockError(null);
    setOpen(true);
  }

  function openEditBlock(block: Block) {
    setEditingBlock(block);
    setDiaSemana(block.diaSemana);
    setHoraInicio(block.horaInicio);
    setHoraFin(block.horaFin);
    setBlockError(null);
    setOpen(true);
  }

  async function handleGuardarBloque() {
    setBlockError(null);
    setSavingBlock(true);
    try {
      const response = await fetch(
        editingBlock ? `/api/schedule/blocks/${editingBlock.id}` : "/api/schedule/blocks",
        {
          method: editingBlock ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diaSemana, horaInicio, horaFin }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setBlockError(data.error ?? "No se pudo guardar el bloque.");
        return;
      }
      setBlocks((prev) =>
        editingBlock
          ? prev.map((b) => (b.id === data.block.id ? data.block : b))
          : [...prev, data.block]
      );
      setOpen(false);
    } finally {
      setSavingBlock(false);
    }
  }

  async function handleEliminarBloque() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/schedule/blocks/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        setDeleteError(data.error ?? "No se pudo eliminar el bloque.");
        return;
      }
      setBlocks((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Duración de turnos"
        description="Define cuántos minutos dura cada turno disponible para reservar."
        icon={Clock}
      >
        <Label>Minutos por turno</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={5}
            max={240}
            className="max-w-32"
            value={slotDurationMinutes}
            onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
          />
          <Button type="button" onClick={handleGuardarDuracion} disabled={savingDuration}>
            {savingDuration ? "Guardando..." : "Guardar"}
          </Button>
        </div>
        {durationError && <p className="text-sm text-destructive">{durationError}</p>}
        {rescheduledCount !== null && (
          <p className="text-sm text-muted-foreground">
            {rescheduledCount === 0
              ? "Duración actualizada."
              : `Duración actualizada y ${rescheduledCount} turno${rescheduledCount === 1 ? "" : "s"} reprogramado${rescheduledCount === 1 ? "" : "s"}.`}{" "}
            {rescheduledCount > 0 && (
              <>
                Se recomienda notificar a los pacientes afectados desde{" "}
                <Link href="/recordatorios" className="font-medium text-primary hover:underline">
                  Recordatorios
                </Link>
                .
              </>
            )}
          </p>
        )}
      </SettingsSection>

      <SettingsSection
        title="Bloques de horario"
        description="Configurá los días y horarios en los que atendés; a partir de esto se generan los turnos disponibles."
        icon={CalendarDays}
      >
        {blocks.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no agregaste ningún bloque.</p>
        )}

        {blocks.map((block) => (
          <div
            key={block.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <span className="text-sm">
              <strong>{DIA_LABELS[block.diaSemana]}</strong> ·{" "}
              {block.horaInicio} a {block.horaFin}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openEditBlock(block)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Editar bloque"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(block);
                  setDeleteError(null);
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Eliminar bloque"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <Button type="button" onClick={openAddBlock}>
              <Plus className="size-4" />
              Nuevo bloque
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBlock ? "Editar bloque de horario" : "Nuevo bloque de horario"}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Día</Label>
                  <Select value={diaSemana} onValueChange={(v) => setDiaSemana(v as DiaSemana)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIA_SEMANA_VALUES.map((dia) => (
                        <SelectItem key={dia} value={dia}>
                          {DIA_LABELS[dia]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Entrada</Label>
                    <Input
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Salida</Label>
                    <Input
                      type="time"
                      value={horaFin}
                      onChange={(e) => setHoraFin(e.target.value)}
                    />
                  </div>
                </div>
                {blockError && <p className="text-sm text-destructive">{blockError}</p>}
              </div>
              <DialogFooter>
                <Button type="button" onClick={handleGuardarBloque} disabled={savingBlock}>
                  {savingBlock
                    ? editingBlock
                      ? "Guardando..."
                      : "Agregando..."
                    : editingBlock
                      ? "Guardar"
                      : "Agregar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SettingsSection>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar bloque de horario</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <p className="text-sm text-muted-foreground">
              Se eliminará el bloque de <strong>{DIA_LABELS[deleteTarget.diaSemana]}</strong> de{" "}
              {deleteTarget.horaInicio} a {deleteTarget.horaFin}.
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
            <Button
              type="button"
              variant="destructive"
              onClick={handleEliminarBloque}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reschedulePreview !== null}
        onOpenChange={(o) => {
          if (!o) {
            setReschedulePreview(null);
            setPendingDuration(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-amber-600" />
              Reprogramar turnos
            </DialogTitle>
          </DialogHeader>
          {pendingDuration !== null && (
            <p className="text-sm text-muted-foreground">
              {pendingDuration < savedDurationMinutes
                ? `Al achicar la duración a ${pendingDuration} minutos, los turnos agendados de hoy en adelante que ya no encajen en la nueva grilla se van a mover hacia adelante, al próximo turno libre más cercano.`
                : `Al agrandar la duración a ${pendingDuration} minutos, los turnos agendados de hoy en adelante se van a atrasar (incluso pudiendo pasar a otro día), reprogramados lo más cerca posible de su horario actual.`}
            </p>
          )}
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {reschedulePreview?.map((item) => (
              <div key={item.turnoId} className="rounded-md border p-2 text-sm">
                <p className="font-medium">{item.nombreYApellido}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFechaHora(item.oldInicio)} → {formatFechaHora(item.newInicio)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Se recomienda notificar a los pacientes afectados sobre el cambio de turno.
          </p>
          {durationError && <p className="text-sm text-destructive">{durationError}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReschedulePreview(null);
                setPendingDuration(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarReprogramacion}
              disabled={applyingReschedule}
            >
              {applyingReschedule ? "Reprogramando..." : "Confirmar y reprogramar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
