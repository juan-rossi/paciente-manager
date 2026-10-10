"use client";

import { useState } from "react";
import type { UserRole } from "@/lib/auth";
import type { BloqueDelDia } from "@/lib/bloques-dia";
import { formatDateParamBA } from "@/lib/timezone";
import type { ResolucionBloqueState, Slot } from "./types";

// Estado y acciones de "Bloquear horarios" (incluido el wizard de
// conflictos) y de "Desbloquear horario" -- ver `useTurnoForm` sobre por
// qué es un hook llamado desde `TurnosCalendar`.
export function useBloqueo({ role, bloques, selectedDate, loadSlots }: {
  role: UserRole;
  bloques: BloqueDelDia<Slot>[];
  selectedDate: Date;
  loadSlots: (date: Date) => Promise<void>;
}) {
  const [bloqueoOpen, setBloqueoOpen] = useState(false);
  const [bloqueoModo, setBloqueoModo] = useState<"dia" | "bloques">("dia");
  const [bloqueoBloqueKeys, setBloqueoBloqueKeys] = useState<string[]>([]);
  const [bloqueoMotivo, setBloqueoMotivo] = useState("");
  const [bloqueoSaving, setBloqueoSaving] = useState(false);
  const [bloqueoError, setBloqueoError] = useState<string | null>(null);
  // Paso 2 del diálogo (wizard por bloque, alternativa "A"): si el rango a
  // bloquear tiene turnos confirmados adentro, el POST inicial devuelve 409
  // con los bloques afectados en vez de crear el bloqueo -- se muestran acá,
  // uno a la vez, sin cerrar el diálogo, hasta que el usuario elige cómo
  // resolver cada uno.
  const [bloqueoStep, setBloqueoStep] = useState<"form" | "conflicto">("form");
  const [bloqueoConflictoBloques, setBloqueoConflictoBloques] = useState<
    {
      key: string;
      lugarId: string;
      inicio: string;
      fin: string;
      turnos: { id: string; nombreYApellido: string; inicio: string }[];
    }[]
  >([]);
  // A qué bloque del wizard corresponde el paso que se está mostrando --
  // índice sobre `bloqueoConflictoBloques`.
  const [bloqueoWizardIndex, setBloqueoWizardIndex] = useState(0);
  // Los próximos 10 días sin horario configurado de CADA lugar afectado
  // (puede haber más de un bloque del mismo lugar) -- se busca por
  // `lugarId` del bloque actual.
  const [bloqueoDiasLibreDisponibles, setBloqueoDiasLibreDisponibles] = useState<
    { lugarId: string; fechas: string[] }[]
  >([]);
  // Un estado de resolución por bloque (keyed por `bloque.key`) -- conserva
  // lo elegido en cada bloque al navegar Anterior/Siguiente sin perder los
  // demás. "Horarios consecutivos"/"Habilitar turnos nuevos ese día" solo
  // aplican con `resolucion: "mover_dia_libre"` (ver `resolverConflictos`).
  const [bloqueoResolucionesPorBloque, setBloqueoResolucionesPorBloque] = useState<
    Record<string, ResolucionBloqueState>
  >({});
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [unblockTarget, setUnblockTarget] = useState<{
    bloqueoId: string;
    lugarId?: string;
    label: string;
    // El tramo horario EXACTO de la card que se clickeó -- puede ser menor
    // al rango completo de la fila real (ver `dividirBloqueoExcluyendoRango`
    // en bloqueo-horario.ts, ej. un bloqueo cubre mañana y tarde con un
    // corte al mediodía, y esta card es solo una de las dos mitades).
    rangoInicio?: string;
    rangoFin?: string;
  } | null>(null);

  function openBloqueoDialog() {
    // Una secretaria nunca ve la opción "Día completo" -- bloquea siempre
    // por bloques puntuales de su único lugar (ver Tabs más abajo, oculto
    // para su rol). Con un solo bloque disponible ese día no tiene sentido
    // obligarla a tildarlo a mano -- arranca preseleccionado.
    setBloqueoModo(role === "SECRETARY" ? "bloques" : "dia");
    setBloqueoBloqueKeys(role === "SECRETARY" && bloques.length === 1 ? [bloques[0].key] : []);
    setBloqueoMotivo("");
    setBloqueoError(null);
    setBloqueoStep("form");
    setBloqueoConflictoBloques([]);
    setBloqueoWizardIndex(0);
    setBloqueoDiasLibreDisponibles([]);
    setBloqueoResolucionesPorBloque({});
    setBloqueoOpen(true);
  }

  function toggleBloqueKey(key: string, checked: boolean) {
    setBloqueoBloqueKeys((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  }

  function buildBloqueoBody(
    resolucionesPorBloque?: {
      bloqueKey: string;
      resolucion: "cancelar" | "mover_dia_libre" | "mover_siguiente_libre";
      fecha?: string;
      horariosConsecutivos?: boolean;
      habilitarTurnosNuevos?: boolean;
    }[]
  ) {
    return bloqueoModo === "dia"
      ? {
          modo: "dia",
          fecha: formatDateParamBA(selectedDate),
          motivo: bloqueoMotivo,
          resolucionesPorBloque,
        }
      : {
          modo: "bloques",
          fecha: formatDateParamBA(selectedDate),
          bloqueKeys: bloqueoBloqueKeys,
          motivo: bloqueoMotivo,
          resolucionesPorBloque,
        };
  }

  async function handleSubmitBloqueo() {
    if (bloqueoModo === "bloques" && bloqueoBloqueKeys.length === 0) {
      setBloqueoError("Elegí al menos un bloque.");
      return;
    }
    setBloqueoError(null);
    setBloqueoSaving(true);
    try {
      const response = await fetch("/api/horarios-bloqueados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBloqueoBody()),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 && data.conflict) {
          const bloquesConflicto: typeof bloqueoConflictoBloques = data.bloques ?? [];
          const disponibles: { lugarId: string; fechas: string[] }[] = data.diasLibreDisponibles ?? [];
          setBloqueoConflictoBloques(bloquesConflicto);
          setBloqueoDiasLibreDisponibles(disponibles);
          setBloqueoResolucionesPorBloque(
            Object.fromEntries(
              bloquesConflicto.map((b) => {
                const fechas = disponibles.find((d) => d.lugarId === b.lugarId)?.fechas ?? [];
                return [
                  b.key,
                  {
                    resolucion: "cancelar" as const,
                    diaLibreElegido: fechas[0] ?? "",
                    horariosConsecutivos: false,
                    habilitarTurnosNuevos: true,
                  },
                ];
              })
            )
          );
          setBloqueoWizardIndex(0);
          setBloqueoStep("conflicto");
          return;
        }
        setBloqueoError(data.error ?? "No se pudo bloquear el horario.");
        return;
      }
      setBloqueoOpen(false);
      await loadSlots(selectedDate);
    } finally {
      setBloqueoSaving(false);
    }
  }

  const bloqueoCurrentBloque = bloqueoConflictoBloques[bloqueoWizardIndex];
  const bloqueoCurrentResolucion = bloqueoCurrentBloque
    ? bloqueoResolucionesPorBloque[bloqueoCurrentBloque.key]
    : undefined;
  const bloqueoIsFirstBloque = bloqueoWizardIndex === 0;
  const bloqueoIsLastBloque = bloqueoWizardIndex === bloqueoConflictoBloques.length - 1;
  const bloqueoFechasDelBloqueActual = bloqueoCurrentBloque
    ? (bloqueoDiasLibreDisponibles.find((d) => d.lugarId === bloqueoCurrentBloque.lugarId)?.fechas ?? [])
    : [];

  function updateBloqueoCurrentResolucion(patch: Partial<ResolucionBloqueState>) {
    if (!bloqueoCurrentBloque) return;
    const key = bloqueoCurrentBloque.key;
    setBloqueoResolucionesPorBloque((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function handleBloqueoAnterior() {
    setBloqueoError(null);
    if (bloqueoIsFirstBloque) {
      setBloqueoStep("form");
      return;
    }
    setBloqueoWizardIndex((i) => i - 1);
  }

  async function handleConfirmResolucion() {
    if (!bloqueoCurrentBloque || !bloqueoCurrentResolucion) return;
    if (
      bloqueoCurrentResolucion.resolucion === "mover_dia_libre" &&
      (bloqueoFechasDelBloqueActual.length === 0 || !bloqueoCurrentResolucion.diaLibreElegido)
    ) {
      setBloqueoError("Elegí a qué día mover estos turnos.");
      return;
    }
    setBloqueoError(null);

    if (!bloqueoIsLastBloque) {
      setBloqueoWizardIndex((i) => i + 1);
      return;
    }

    setBloqueoSaving(true);
    try {
      const resolucionesPorBloque = bloqueoConflictoBloques.map((b) => {
        const r = bloqueoResolucionesPorBloque[b.key];
        return {
          bloqueKey: b.key,
          resolucion: r.resolucion,
          fecha: r.resolucion === "mover_dia_libre" ? r.diaLibreElegido : undefined,
          horariosConsecutivos: r.horariosConsecutivos,
          habilitarTurnosNuevos: r.habilitarTurnosNuevos,
        };
      });
      const response = await fetch("/api/horarios-bloqueados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBloqueoBody(resolucionesPorBloque)),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 && data.conflict === undefined) {
          // Los bloques cambiaron entre el 409 inicial y esta confirmación
          // (ej. alguien canceló un turno desde otra pestaña mientras el
          // diálogo seguía abierto) -- se vuelve al paso "form" en vez de
          // reintentar en silencio con datos que ya no aplican.
          setBloqueoStep("form");
          setBloqueoError(data.error ?? "Los bloques en conflicto cambiaron -- volvé a intentar.");
          return;
        }
        setBloqueoError(data.error ?? "No se pudo resolver los turnos afectados.");
        return;
      }
      setBloqueoOpen(false);
      await loadSlots(selectedDate);
    } finally {
      setBloqueoSaving(false);
    }
  }

  // Abre el diálogo de confirmación en vez de desbloquear directo -- `label`
  // es lo que se muestra ahí para que quede claro exactamente qué se va a
  // desbloquear (un lugar puntual, o "todo el día" desde la lista del
  // diálogo de bloqueo).
  function requestUnblock(
    bloqueoId: string,
    label: string,
    lugarId?: string,
    rangoInicio?: string,
    rangoFin?: string
  ) {
    setUnblockTarget({ bloqueoId, lugarId, label, rangoInicio, rangoFin });
  }

  // `lugarId`+`rangoInicio`+`rangoFin` se mandan siempre que el desbloqueo
  // sale de UNA card puntual de la grilla -- ahí el server libera solo el
  // tramo horario de ESA card (que puede ser apenas una mitad del rango
  // real de la fila, ver `dividirBloqueoExcluyendoRango`), no todo el día
  // ni el resto de los tramos del mismo lugar.
  async function handleConfirmUnblock() {
    if (!unblockTarget) return;
    const { bloqueoId, lugarId, rangoInicio, rangoFin } = unblockTarget;
    setUnblockingId(bloqueoId);
    try {
      const params = new URLSearchParams();
      if (lugarId) params.set("lugarId", lugarId);
      if (rangoInicio) params.set("inicio", rangoInicio);
      if (rangoFin) params.set("fin", rangoFin);
      const query = params.toString() ? `?${params.toString()}` : "";
      await fetch(`/api/horarios-bloqueados/${bloqueoId}${query}`, { method: "DELETE" });
      await loadSlots(selectedDate);
      setUnblockTarget(null);
    } finally {
      setUnblockingId(null);
    }
  }

  return {
    bloqueoOpen,
    setBloqueoOpen,
    bloqueoModo,
    setBloqueoModo,
    bloqueoBloqueKeys,
    setBloqueoBloqueKeys,
    bloqueoMotivo,
    setBloqueoMotivo,
    bloqueoSaving,
    setBloqueoSaving,
    bloqueoError,
    setBloqueoError,
    bloqueoStep,
    setBloqueoStep,
    bloqueoConflictoBloques,
    setBloqueoConflictoBloques,
    bloqueoWizardIndex,
    setBloqueoWizardIndex,
    bloqueoDiasLibreDisponibles,
    setBloqueoDiasLibreDisponibles,
    bloqueoResolucionesPorBloque,
    setBloqueoResolucionesPorBloque,
    unblockingId,
    setUnblockingId,
    unblockTarget,
    setUnblockTarget,
    openBloqueoDialog,
    toggleBloqueKey,
    buildBloqueoBody,
    handleSubmitBloqueo,
    updateBloqueoCurrentResolucion,
    handleBloqueoAnterior,
    handleConfirmResolucion,
    requestUnblock,
    handleConfirmUnblock,
    bloqueoCurrentBloque,
    bloqueoCurrentResolucion,
    bloqueoIsFirstBloque,
    bloqueoIsLastBloque,
    bloqueoFechasDelBloqueActual,
  };
}

export type BloqueoState = ReturnType<typeof useBloqueo>;
