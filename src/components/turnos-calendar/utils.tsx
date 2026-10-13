import { Building2, Check, Clock, Mail, MapPin, X, type LucideIcon } from "lucide-react";
import { rangesOverlap } from "@/lib/bloques-dia";
import { ESTADO_VISUAL_LABELS, type EstadoVisualTurno } from "@/lib/turno-estado";
import { formatHoraBA, getMinutesSinceMidnightBA } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import type { LugarInfo, Slot } from "./types";

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function OnlineBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border border-sky-600 bg-card px-1.5 py-px text-[9px] font-extrabold tracking-wide text-sky-600 dark:border-sky-400 dark:text-sky-400",
        className
      )}
    >
      ONLINE
    </span>
  );
}

// Fondo suave + ícono por estado (ver `estadoVisualTurno`). El ámbar queda
// para los sobreturnos y el celeste para el badge ONLINE.
export const ESTADO_TURNO_BLOQUE: Record<EstadoVisualTurno, string> = {
  NUEVO:
    "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800/70",
  RECORDATORIO_ENVIADO: "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
  CONFIRMADO:
    "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950/80",
  CANCELADO:
    "border-dashed border-rose-300 bg-rose-50/70 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/60",
};

const ESTADO_TURNO_ICONO: Record<EstadoVisualTurno, { fondo: string; Icono: LucideIcon | null }> = {
  NUEVO: { fondo: "bg-slate-400 dark:bg-slate-500", Icono: null },
  RECORDATORIO_ENVIADO: { fondo: "bg-primary", Icono: Mail },
  CONFIRMADO: { fondo: "bg-emerald-500", Icono: Check },
  CANCELADO: { fondo: "bg-rose-500", Icono: X },
};

export function EstadoTurnoIcono({ estado, className }: { estado: EstadoVisualTurno; className?: string }) {
  const { fondo, Icono } = ESTADO_TURNO_ICONO[estado];
  return (
    <span
      aria-hidden
      className={cn("grid size-4 shrink-0 place-items-center rounded-full text-white", fondo, className)}
    >
      {Icono ? <Icono className="size-2.5" strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-white" />}
    </span>
  );
}

export function EstadosLeyenda() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-xs text-muted-foreground">
      {(Object.keys(ESTADO_VISUAL_LABELS) as EstadoVisualTurno[]).map((estado) => (
        <span key={estado} className="inline-flex items-center gap-1.5">
          <EstadoTurnoIcono estado={estado} />
          {ESTADO_VISUAL_LABELS[estado]}
        </span>
      ))}
    </div>
  );
}

export function formatHora(iso: string) {
  return formatHoraBA(new Date(iso));
}

export function minutesFromMidnight(iso: string) {
  return getMinutesSinceMidnightBA(new Date(iso));
}

type MergedRow = {
  key: string;
  leftPieces: Slot[];
  sobreturnosAqui: Slot[];
};

// Un sobreturno tiene siempre la misma duración que un turno normal, así que
// si arranca fuera de la grilla necesariamente invade la cola de un slot y la
// cabeza del siguiente (nunca entra limpio en uno solo) -- por eso se agrupan
// los slots que toca en una sola fila "fusionada" que se divide en dos
// mitades: lo que había antes (libre u ocupado) a la izquierda, el/los
// sobreturno(s) a la derecha. En mobile esas dos mitades se apilan en vez de
// ir lado a lado (ver el `flex-col sm:flex-row` en el render).
export function mergeSobreturnos(slots: Slot[], sobreturnos: Slot[]) {
  const mergedRows: MergedRow[] = [];
  const standalone: Slot[] = [];
  const consumedInicios = new Set<string>();

  for (const sob of sobreturnos) {
    const overlapping = slots.filter((s) => rangesOverlap(sob.inicio, sob.fin, s.inicio, s.fin));
    if (overlapping.length === 0) {
      standalone.push(sob);
      continue;
    }
    const row = mergedRows.find((r) =>
      r.leftPieces.some((piece) => overlapping.some((s) => s.inicio === piece.inicio))
    );
    if (row) {
      for (const s of overlapping) {
        if (!row.leftPieces.some((piece) => piece.inicio === s.inicio)) row.leftPieces.push(s);
      }
      row.sobreturnosAqui.push(sob);
    } else {
      mergedRows.push({ key: `merge-${sob.inicio}`, leftPieces: [...overlapping], sobreturnosAqui: [sob] });
    }
    overlapping.forEach((s) => consumedInicios.add(s.inicio));
  }

  return { mergedRows, standalone, consumedInicios };
}

type BloqueadoRow = {
  key: string;
  bloqueoId: string;
  motivo: string | null;
  slots: Slot[];
};

// Igual que `mergeSobreturnos`, pero para horarios bloqueados: una
// secuencia de slots libres consecutivos bloqueados por el MISMO
// `bloqueoId` se dibuja como una sola card que abarca todo el rango, en
// vez de una card repetida por cada slot individual (ilegible apenas el
// bloqueo cubre más de uno o dos slots). Un turno ya reservado ANTES de
// crear el bloqueo corta la secuencia (esos slots no entran acá, ver el
// filtro `!slot.turno`), así que puede haber más de una fila para el
// mismo `bloqueoId` si un turno existente quedó en el medio.
export function agruparBloqueados(slots: Slot[]): BloqueadoRow[] {
  const rows: BloqueadoRow[] = [];
  for (const slot of slots) {
    if (slot.turno || !slot.bloqueado) continue;
    const last = rows[rows.length - 1];
    const ultimoSlot = last?.slots[last.slots.length - 1];
    if (last && last.bloqueoId === slot.bloqueado.bloqueoId && ultimoSlot?.fin === slot.inicio) {
      last.slots.push(slot);
    } else {
      rows.push({
        key: `bloqueado-${slot.bloqueado.bloqueoId}-${slot.inicio}`,
        bloqueoId: slot.bloqueado.bloqueoId,
        motivo: slot.bloqueado.motivo,
        slots: [slot],
      });
    }
  }
  return rows;
}

export function getGridRange(slots: Slot[]) {
  if (slots.length === 0) {
    return { startMinutes: DEFAULT_START_HOUR * 60, endMinutes: DEFAULT_END_HOUR * 60 };
  }
  const starts = slots.map((s) => minutesFromMidnight(s.inicio));
  const ends = slots.map((s) => minutesFromMidnight(s.fin));
  const startMinutes = Math.min(...starts);
  const endMinutes = Math.max(...ends);
  return { startMinutes, endMinutes: Math.max(endMinutes, startMinutes + 60) };
}

export function lugarNombre(lugar: LugarInfo | undefined) {
  return lugar?.nombre?.trim() || "Consulta particular";
}

export function tipoLabel(tipo: string) {
  return tipo === "CONSULTORIO" ? "Consultorio" : "Particular";
}

export function LugarIcon({ tipo }: { tipo: string | undefined }) {
  if (tipo === "CONSULTORIO") return <Building2 className="size-3.5 text-muted-foreground" />;
  if (tipo === "PARTICULAR") return <MapPin className="size-3.5 text-muted-foreground" />;
  return <Clock className="size-3.5 text-muted-foreground" />;
}
