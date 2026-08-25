"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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

type Props = {
  initialBlocks: Block[];
  initialSlotDurationMinutes: number;
};

export function ScheduleSettings({ initialBlocks, initialSlotDurationMinutes }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(initialSlotDurationMinutes);
  const [savingDuration, setSavingDuration] = useState(false);
  const [durationError, setDurationError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [diaSemana, setDiaSemana] = useState<DiaSemana>("LUNES");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("17:00");
  const [addingBlock, setAddingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  async function handleGuardarDuracion() {
    setSavingDuration(true);
    setDurationError(null);
    try {
      const response = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotDurationMinutes }),
      });
      if (!response.ok) {
        const data = await response.json();
        setDurationError(data.error ?? "No se pudo guardar la duración.");
      }
    } finally {
      setSavingDuration(false);
    }
  }

  function openAddBlock() {
    setDiaSemana("LUNES");
    setHoraInicio("09:00");
    setHoraFin("17:00");
    setBlockError(null);
    setOpen(true);
  }

  async function handleAgregarBloque() {
    setBlockError(null);
    setAddingBlock(true);
    try {
      const response = await fetch("/api/schedule/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaSemana, horaInicio, horaFin }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBlockError(data.error ?? "No se pudo agregar el bloque.");
        return;
      }
      setBlocks((prev) => [...prev, data.block]);
      setOpen(false);
    } finally {
      setAddingBlock(false);
    }
  }

  async function handleEliminarBloque(id: string) {
    await fetch(`/api/schedule/blocks/${id}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label>Duración de cada turno (minutos)</Label>
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
      </div>

      <div className="flex flex-col gap-3">
        <Label>Bloques de horario</Label>

        {blocks.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no agregaste ningún bloque.</p>
        )}

        {blocks.map((block) => (
          <div
            key={block.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <span className="text-sm">
              <span className="font-medium">{DIA_LABELS[block.diaSemana]}</span> ·{" "}
              {block.horaInicio} a {block.horaFin}
            </span>
            <button
              type="button"
              onClick={() => handleEliminarBloque(block.id)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Eliminar bloque"
            >
              <Trash2 className="size-4" />
            </button>
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
                <DialogTitle>Nuevo bloque de horario</DialogTitle>
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
                <Button type="button" onClick={handleAgregarBloque} disabled={addingBlock}>
                  {addingBlock ? "Agregando..." : "Agregar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
