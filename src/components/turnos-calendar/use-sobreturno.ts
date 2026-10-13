"use client";

import { useState } from "react";
import { DNI_ERROR_MESSAGE, DNI_REGEX } from "@/lib/dni";
import type { BloqueDelDia } from "@/lib/bloques-dia";
import type { Slot } from "./types";

// Estado y acciones del diálogo "Agregar sobreturno" -- ver
// `useTurnoForm` sobre por qué es un hook llamado desde `TurnosCalendar`.
export function useSobreturno({ bloques, selectedDate, loadSlots }: {
  bloques: BloqueDelDia<Slot>[];
  selectedDate: Date;
  loadSlots: (date: Date) => Promise<void>;
}) {
  const [sobreturnoOpen, setSobreturnoOpen] = useState(false);
  // A qué bloque de horario (lugar + tramo contiguo, ver `bloquesDelDia`)
  // pertenece el sobreturno que se está por agregar -- necesario porque un
  // mismo día puede tener más de un bloque (dos lugares, o el mismo lugar
  // partido por un corte a mediodía) y "el final de la lista" ya no tiene
  // un único sentido en ese caso.
  const [sobreturnoBloqueKey, setSobreturnoBloqueKey] = useState("");
  const [sobreturnoModo, setSobreturnoModo] = useState<"hora" | "final">("hora");
  const [sobreturnoTurnoId, setSobreturnoTurnoId] = useState("");
  const [sobreturnoNombre, setSobreturnoNombre] = useState("");
  const [sobreturnoDni, setSobreturnoDni] = useState("");
  const [sobreturnoTelefono, setSobreturnoTelefono] = useState("");
  const [sobreturnoObraSocial, setSobreturnoObraSocial] = useState("");
  const [sobreturnoSaving, setSobreturnoSaving] = useState(false);
  const [sobreturnoError, setSobreturnoError] = useState<string | null>(null);
  const [sobreturnoTriedSubmit, setSobreturnoTriedSubmit] = useState(false);

  function bloqueActivo(): BloqueDelDia<Slot> | undefined {
    return bloques.find((b) => b.key === sobreturnoBloqueKey);
  }

  // El slot (normal o sobreturno) que termina más tarde DENTRO de ese
  // bloque -- `null` si todavía no hay ningún turno agendado ahí, en cuyo
  // caso "al final" no tiene sentido (la lista está vacía) y esa opción se
  // deshabilita.
  function ultimoSlotDelBloque(bloque: BloqueDelDia<Slot> | undefined): Slot | null {
    if (!bloque) return null;
    const ocupados = [...bloque.slots.filter((s) => s.turno), ...bloque.sobreturnos];
    if (ocupados.length === 0) return null;
    return ocupados.reduce((max, s) =>
      new Date(s.fin).getTime() > new Date(max.fin).getTime() ? s : max
    );
  }

  // Los turnos normales (no sobreturnos) ya ocupados en ese bloque que
  // todavía no tienen un sobreturno propio -- de acá sale la lista del
  // select "Junto a un turno" (solo se permite un sobreturno por horario).
  function ocupadosDelBloque(bloque: BloqueDelDia<Slot> | undefined): Slot[] {
    if (!bloque) return [];
    const sobreturnoInicios = new Set(bloque.sobreturnos.map((s) => s.inicio));
    return bloque.slots.filter((s) => s.turno && !sobreturnoInicios.has(s.inicio));
  }

  // Se llama al abrir el diálogo y cada vez que el usuario cambia de
  // bloque en el paso "¿En qué bloque de horario?" -- recalcula el modo y
  // el turno preseleccionado para el bloque recién elegido, porque los que
  // valían para el bloque anterior pueden no existir en este.
  function elegirBloqueSobreturno(key: string) {
    setSobreturnoBloqueKey(key);
    const bloque = bloques.find((b) => b.key === key);
    const ocupados = ocupadosDelBloque(bloque);
    setSobreturnoModo(ultimoSlotDelBloque(bloque) ? "final" : "hora");
    setSobreturnoTurnoId(ocupados[0]?.turno?.id ?? "");
  }

  function openSobreturnoDialog() {
    elegirBloqueSobreturno(bloques[0]?.key ?? "");
    setSobreturnoNombre("");
    setSobreturnoDni("");
    setSobreturnoTelefono("");
    setSobreturnoObraSocial("");
    setSobreturnoError(null);
    setSobreturnoTriedSubmit(false);
    setSobreturnoOpen(true);
  }

  async function handleSubmitSobreturno() {
    if (!sobreturnoNombre.trim() || !sobreturnoDni.trim() || !sobreturnoTelefono.trim()) {
      setSobreturnoTriedSubmit(true);
      setSobreturnoError("Completá nombre, DNI y teléfono.");
      return;
    }
    if (!DNI_REGEX.test(sobreturnoDni)) {
      setSobreturnoTriedSubmit(true);
      setSobreturnoError(DNI_ERROR_MESSAGE);
      return;
    }

    const bloque = bloqueActivo();
    let inicio: Date | null;
    if (sobreturnoModo === "final") {
      const ultimo = ultimoSlotDelBloque(bloque);
      inicio = ultimo ? new Date(ultimo.fin) : null;
    } else {
      const turnoSlot = ocupadosDelBloque(bloque).find((s) => s.turno!.id === sobreturnoTurnoId);
      inicio = turnoSlot ? new Date(turnoSlot.inicio) : null;
    }
    const lugarId = bloque?.lugarId;
    if (!inicio || !lugarId) {
      setSobreturnoError(
        sobreturnoModo === "final"
          ? "No hay turnos agendados para calcular el final de este bloque."
          : "Elegí un turno."
      );
      return;
    }

    setSobreturnoError(null);
    setSobreturnoSaving(true);
    try {
      const response = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inicio: inicio.toISOString(),
          nombreYApellido: sobreturnoNombre,
          dni: sobreturnoDni,
          telefono: sobreturnoTelefono,
          obraSocial: sobreturnoObraSocial,
          esSobreturno: true,
          lugarId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSobreturnoError(data.error ?? "No se pudo agregar el sobreturno.");
        return;
      }
      setSobreturnoOpen(false);
      await loadSlots(selectedDate);
    } finally {
      setSobreturnoSaving(false);
    }
  }

  const bloqueSobreturno = bloqueActivo();
  const ocupadosBloqueSobreturno = ocupadosDelBloque(bloqueSobreturno);

  return {
    sobreturnoOpen,
    setSobreturnoOpen,
    sobreturnoBloqueKey,
    setSobreturnoBloqueKey,
    sobreturnoModo,
    setSobreturnoModo,
    sobreturnoTurnoId,
    setSobreturnoTurnoId,
    sobreturnoNombre,
    setSobreturnoNombre,
    sobreturnoDni,
    setSobreturnoDni,
    sobreturnoTelefono,
    setSobreturnoTelefono,
    sobreturnoObraSocial,
    setSobreturnoObraSocial,
    sobreturnoSaving,
    setSobreturnoSaving,
    sobreturnoError,
    setSobreturnoError,
    sobreturnoTriedSubmit,
    setSobreturnoTriedSubmit,
    bloqueActivo,
    ultimoSlotDelBloque,
    ocupadosDelBloque,
    elegirBloqueSobreturno,
    openSobreturnoDialog,
    handleSubmitSobreturno,
    bloqueSobreturno,
    ocupadosBloqueSobreturno,
  };
}

export type SobreturnoState = ReturnType<typeof useSobreturno>;
