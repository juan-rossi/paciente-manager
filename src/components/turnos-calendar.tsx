"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { es } from "date-fns/locale";
import {
  formatCaption as defaultFormatCaption,
  formatWeekdayName as defaultFormatWeekdayName,
} from "react-day-picker";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from "lucide-react";
import { diaSemanaFromDate, type DiaSemana } from "@/lib/slots";
import { nextDiaConHorario } from "@/lib/dia-nav";
import {
  dateParamToDateBA,
  formatDateParamBA,
  formatHoraBA,
  getMinutesSinceMidnightBA,
  isSameDayBA,
  startOfDayBA,
} from "@/lib/timezone";
import { cn, filterTelefono } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TurnoInfo = {
  id: string;
  nombreYApellido: string;
  fechaNacimiento: string | null;
  dni: string | null;
  telefono: string;
  obraSocial: string | null;
  obraSocialNro: string | null;
  patientId?: string | null;
  origen: string;
};

type Slot = {
  inicio: string;
  fin: string;
  lugarId: string;
  turno: TurnoInfo | null;
};

type LugarInfo = {
  id: string;
  nombre: string | null;
  tipo: string;
  ciudad: string | null;
};

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function OnlineBadge({ className }: { className?: string }) {
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

function formatHora(iso: string) {
  return formatHoraBA(new Date(iso));
}

function minutesFromMidnight(iso: string) {
  return getMinutesSinceMidnightBA(new Date(iso));
}

function rangesOverlap(aInicio: string, aFin: string, bInicio: string, bFin: string) {
  return new Date(aInicio) < new Date(bFin) && new Date(aFin) > new Date(bInicio);
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
function mergeSobreturnos(slots: Slot[], sobreturnos: Slot[]) {
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

function getGridRange(slots: Slot[]) {
  if (slots.length === 0) {
    return { startMinutes: DEFAULT_START_HOUR * 60, endMinutes: DEFAULT_END_HOUR * 60 };
  }
  const starts = slots.map((s) => minutesFromMidnight(s.inicio));
  const ends = slots.map((s) => minutesFromMidnight(s.fin));
  const startMinutes = Math.min(...starts);
  const endMinutes = Math.max(...ends);
  return { startMinutes, endMinutes: Math.max(endMinutes, startMinutes + 60) };
}

type LugarGrupo = {
  lugarId: string;
  slots: Slot[];
  sobreturnos: Slot[];
};

// Un médico con más de un lugar de trabajo puede tener horarios en horas
// bien separadas del día (mañana en un consultorio, tarde en otro) -- ver
// esa fecha como una única grilla continua deja un hueco vacío y sin
// explicación entre ambos tramos. Agrupar por lugar (en el orden en que
// aparece cada uno por primera vez, ya vienen ordenados cronológicamente)
// permite que cada lugar tenga su propia mini-grilla acotada a su propio
// rango horario, sin ese hueco muerto.
function agruparPorLugar(slots: Slot[], sobreturnos: Slot[]): LugarGrupo[] {
  const orden: string[] = [];
  const grupos = new Map<string, LugarGrupo>();
  function ensure(lugarId: string) {
    let grupo = grupos.get(lugarId);
    if (!grupo) {
      grupo = { lugarId, slots: [], sobreturnos: [] };
      grupos.set(lugarId, grupo);
      orden.push(lugarId);
    }
    return grupo;
  }
  for (const slot of slots) ensure(slot.lugarId).slots.push(slot);
  for (const sob of sobreturnos) ensure(sob.lugarId).sobreturnos.push(sob);
  return orden.map((lugarId) => grupos.get(lugarId)!);
}

// Dentro de un mismo lugar puede haber más de un bloque de horario cargado
// para el mismo día (ej.: mañana y tarde, con un corte al mediodía) -- una
// sola grilla continua de 09:00 a 16:45 deja un espacio enorme y vacío en
// el medio, porque esa franja "sin horario" ocupa proporcionalmente el
// mismo lugar que cualquier hora con turnos. Partir `slots` (ya vienen
// ordenados cronológicamente) en tramos contiguos -- cortando apenas el
// fin de un slot no coincide con el inicio del siguiente -- permite darle
// a cada tramo su propia mini-grilla acotada a su propio rango horario.
function partirEnBloquesContiguos(slots: Slot[]): Slot[][] {
  const bloques: Slot[][] = [];
  for (const slot of slots) {
    const bloqueActual = bloques[bloques.length - 1];
    const ultimoSlot = bloqueActual?.[bloqueActual.length - 1];
    if (ultimoSlot && ultimoSlot.fin === slot.inicio) {
      bloqueActual.push(slot);
    } else {
      bloques.push([slot]);
    }
  }
  return bloques;
}

type BloqueDelDia = {
  key: string;
  lugarId: string;
  inicio: string;
  fin: string;
  slots: Slot[];
  sobreturnos: Slot[];
};

// Aplana `agruparPorLugar` + `partirEnBloquesContiguos` en una sola lista de
// "bloques de horario reales" del día -- ej. con Particular 9-11, Particular
// 13-15 y Consultorio1 16-18, da 3 bloques (dos de ellos comparten lugar
// pero no rango horario). Se usa para el diálogo de sobreturno: "junto a un
// turno" nunca es ambiguo (cada turno ya sabe su horario y lugar), pero "al
// final de la lista" sí lo era con más de un bloque en el día -- ahora el
// usuario elige primero EN QUÉ bloque, y todo lo demás se acota a ese.
// A qué tramo (índice) pertenece cada sobreturno: al que solapa de verdad
// (sobreturno "junto a un turno"), o si no solapa a ninguno -- arranca
// justo donde termina uno, sin overlap real -- al tramo anterior más
// cercano (sobreturno "al final de la lista"). Sin este segundo paso, dos
// sobreturnos agregados uno tras otro "al final" quedaban ambos fuera de
// cualquier tramo, así que el segundo recalculaba el mismo horario que el
// primero en vez de encadenarse después -- terminaban superpuestos.
function asignarSobreturnosATramos(
  tramos: { inicio: string; fin: string }[],
  sobreturnos: Slot[]
): Slot[][] {
  const porTramo: Slot[][] = tramos.map(() => []);
  for (const sob of sobreturnos) {
    let index = tramos.findIndex((t) => rangesOverlap(sob.inicio, sob.fin, t.inicio, t.fin));
    if (index === -1) {
      let mejorFin: string | null = null;
      tramos.forEach((t, i) => {
        if (t.fin <= sob.inicio && (mejorFin === null || t.fin > mejorFin!)) {
          mejorFin = t.fin;
          index = i;
        }
      });
    }
    porTramo[index === -1 ? 0 : index].push(sob);
  }
  return porTramo;
}

function bloquesDelDia(grupos: LugarGrupo[]): BloqueDelDia[] {
  const bloques: BloqueDelDia[] = [];
  for (const grupo of grupos) {
    const tramosSlots = partirEnBloquesContiguos(grupo.slots);
    const tramos = tramosSlots.map((tramoSlots) => ({
      inicio: tramoSlots[0].inicio,
      fin: tramoSlots[tramoSlots.length - 1].fin,
    }));
    const sobreturnosPorTramo = asignarSobreturnosATramos(tramos, grupo.sobreturnos);
    tramosSlots.forEach((tramoSlots, i) => {
      bloques.push({
        key: `${grupo.lugarId}-${tramos[i].inicio}`,
        lugarId: grupo.lugarId,
        inicio: tramos[i].inicio,
        fin: tramos[i].fin,
        slots: tramoSlots,
        sobreturnos: sobreturnosPorTramo[i],
      });
    });
  }
  return bloques;
}

function lugarNombre(lugar: LugarInfo | undefined) {
  return lugar?.nombre?.trim() || "Consulta particular";
}

function tipoLabel(tipo: string) {
  return tipo === "CONSULTORIO" ? "Consultorio" : "Particular";
}

function LugarIcon({ tipo }: { tipo: string | undefined }) {
  if (tipo === "CONSULTORIO") return <Building2 className="size-3.5 text-muted-foreground" />;
  if (tipo === "PARTICULAR") return <MapPin className="size-3.5 text-muted-foreground" />;
  return <Clock className="size-3.5 text-muted-foreground" />;
}

// La grilla de un solo tramo contiguo de horario -- se usa una vez por cada
// bloque de `partirEnBloquesContiguos`. Cada instancia calcula su propio
// rango horario (arranca en su primer slot, termina en su último) para no
// arrastrar el eje de tiempo de otro tramo ni de otro lugar.
function BloqueContiguoGrid({
  slots,
  sobreturnos,
  role,
  isPastDay,
  isToday,
  onOpenEdit,
  onOpenBooking,
}: {
  slots: Slot[];
  sobreturnos: Slot[];
  role: UserRole;
  isPastDay: boolean;
  isToday: boolean;
  onOpenEdit: (slot: Slot) => void;
  onOpenBooking: (slot: Slot) => void;
}) {
  const { mergedRows, standalone: standaloneSobreturnos, consumedInicios } = mergeSobreturnos(
    slots,
    sobreturnos
  );
  const { startMinutes, endMinutes } = getGridRange([...slots, ...sobreturnos]);
  const totalMinutes = endMinutes - startMinutes;
  const nowOffsetPct =
    ((getMinutesSinceMidnightBA(new Date()) - startMinutes) / totalMinutes) * 100;
  const showNowLine = isToday && nowOffsetPct >= 0 && nowOffsetPct <= 100;

  if (slots.length === 0) return null;

  // El piso en píxeles tiene que alcanzar para TODAS las filas que se
  // dibujan dentro de este rango horario, no solo los slots de la grilla:
  // un sobreturno "al final de la lista" extiende `totalMinutes` más allá
  // del último slot (ver `getGridRange`) y ocupa su propia franja de
  // tiempo -- si no se cuenta acá, esa franja termina midiendo menos de
  // 44px reales y su `minHeight` forzado la hace pisar a la fila de al
  // lado. Un sobreturno fusionado en `mergedRows` no suma franja nueva:
  // comparte el mismo rango horario que el slot al que está pegado.
  const filasMinimas = slots.length + standaloneSobreturnos.length;

  return (
    <div
      className="relative flex-1 min-h-0"
      style={{ minHeight: Math.max(filasMinimas * 44, 220) }}
    >
      {slots.map((slot) => {
        const top = ((minutesFromMidnight(slot.inicio) - startMinutes) / totalMinutes) * 100;
        return (
          <div
            key={slot.inicio}
            className="absolute inset-x-0 border-t border-border/70"
            style={{ top: `${top}%` }}
          >
            <span className="absolute left-0 top-0 w-12 -translate-y-1/2 bg-card px-1 text-right text-xs text-muted-foreground">
              {formatHora(slot.inicio)}
            </span>
          </div>
        );
      })}

      <div className="absolute inset-y-0 left-12 w-[calc(100%-3rem)]">
        {slots.map((slot) => {
          if (consumedInicios.has(slot.inicio)) return null;
          const top = ((minutesFromMidnight(slot.inicio) - startMinutes) / totalMinutes) * 100;
          const height =
            ((minutesFromMidnight(slot.fin) - minutesFromMidnight(slot.inicio)) / totalMinutes) *
            100;
          const ocupado = Boolean(slot.turno);

          return (
            <button
              key={slot.inicio}
              type="button"
              disabled={isPastDay}
              onClick={() => (slot.turno ? onOpenEdit(slot) : onOpenBooking(slot))}
              style={{
                top: `${top}%`,
                height: `${height}%`,
                minHeight: ocupado ? 44 : 22,
              }}
              aria-label={
                ocupado
                  ? `Turno de ${slot.turno!.nombreYApellido}, ${formatHora(slot.inicio)} a ${formatHora(slot.fin)}${isPastDay ? "." : ". Editar."}`
                  : `Libre, ${formatHora(slot.inicio)} a ${formatHora(slot.fin)}${isPastDay ? "." : ". Reservar."}`
              }
              className={cn(
                "absolute left-1 flex w-[calc(100%-0.5rem)] flex-col justify-center gap-0.5 rounded-md border py-1 pr-2 pl-6 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
                ocupado
                  ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/25"
                  : "border-dashed border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/40 hover:text-foreground"
              )}
            >
              {ocupado ? (
                <>
                  <span className="flex items-center justify-between gap-1.5">
                    <strong className="min-w-0 text-xs leading-tight font-semibold break-words">
                      {slot.turno!.nombreYApellido}
                    </strong>
                    {slot.turno!.origen === "ONLINE" && <OnlineBadge />}
                  </span>
                  <span className="flex items-center gap-2 text-[11px] leading-tight opacity-80">
                    <span className="shrink-0">
                      [ {formatHora(slot.inicio)} - {formatHora(slot.fin)} ]
                    </span>
                    {role === "DOCTOR" && slot.turno!.patientId && (
                      <Link
                        href={`/patients/${slot.turno!.patientId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 underline-offset-2 hover:underline"
                      >
                        Ver ficha
                      </Link>
                    )}
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1 overflow-hidden text-xs">
                  <strong className="shrink-0 font-semibold">Libre</strong>
                  <span className="truncate">
                    [ {formatHora(slot.inicio)} - {formatHora(slot.fin)} ]
                  </span>
                </span>
              )}
            </button>
          );
        })}

        {mergedRows.map((row) => {
          const pieces = [...row.leftPieces].sort((a, b) => a.inicio.localeCompare(b.inicio));
          const allTimes = [...pieces, ...row.sobreturnosAqui];
          const rangeStart = Math.min(...allTimes.map((p) => minutesFromMidnight(p.inicio)));
          const rangeEnd = Math.max(...allTimes.map((p) => minutesFromMidnight(p.fin)));
          const top = ((rangeStart - startMinutes) / totalMinutes) * 100;
          const height = ((rangeEnd - rangeStart) / totalMinutes) * 100;

          return (
            <div
              key={row.key}
              style={{ top: `${top}%`, height: `${height}%` }}
              className="absolute left-1 min-h-11 w-[calc(100%-0.5rem)] overflow-hidden rounded-md border border-border bg-card shadow-sm"
            >
              <div className="flex h-full flex-row">
                <div className="flex flex-1 flex-col">
                  {pieces.map((piece, index) => {
                    const ocupado = Boolean(piece.turno);
                    return (
                      <button
                        key={piece.inicio}
                        type="button"
                        disabled={isPastDay}
                        onClick={() => (piece.turno ? onOpenEdit(piece) : onOpenBooking(piece))}
                        aria-label={
                          ocupado
                            ? `Turno de ${piece.turno!.nombreYApellido}, ${formatHora(piece.inicio)} a ${formatHora(piece.fin)}${isPastDay ? "." : ". Editar."}`
                            : `Libre, ${formatHora(piece.inicio)} a ${formatHora(piece.fin)}${isPastDay ? "." : ". Reservar."}`
                        }
                        className={cn(
                          "flex w-full flex-1 flex-col items-start justify-center px-2 py-1 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
                          index > 0 && "border-t border-dashed border-border/70",
                          ocupado
                            ? "bg-primary/15 text-primary hover:bg-primary/25"
                            : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                        )}
                      >
                        {ocupado ? (
                          <>
                            <span className="flex w-full items-center justify-between gap-1.5">
                              <strong className="min-w-0 text-[11px] leading-tight font-semibold break-words">
                                {piece.turno!.nombreYApellido}
                              </strong>
                              {piece.turno!.origen === "ONLINE" && (
                                <OnlineBadge className="hidden sm:inline-block" />
                              )}
                            </span>
                            <span className="flex items-center gap-2 text-[10px] leading-tight opacity-80">
                              <span className="shrink-0">
                                [ {formatHora(piece.inicio)} - {formatHora(piece.fin)} ]
                              </span>
                              {role === "DOCTOR" && piece.turno!.patientId && (
                                <Link
                                  href={`/patients/${piece.turno!.patientId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0 underline-offset-2 hover:underline"
                                >
                                  Ver ficha
                                </Link>
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px]">
                            <strong className="font-semibold">Libre</strong>{" "}
                            [ {formatHora(piece.inicio)} - {formatHora(piece.fin)} ]
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-1 flex-col border-l border-dashed border-amber-500/70">
                  {row.sobreturnosAqui.map((sob, index) => (
                    <button
                      key={sob.inicio}
                      type="button"
                      disabled={isPastDay}
                      onClick={() => onOpenEdit(sob)}
                      aria-label={`Sobreturno de ${sob.turno!.nombreYApellido}, ${formatHora(sob.inicio)} a ${formatHora(sob.fin)}${isPastDay ? "." : ". Editar."}`}
                      className={cn(
                        "flex w-full flex-1 flex-col items-start justify-center bg-amber-500/15 px-2 py-1 text-left text-amber-800 transition-colors hover:bg-amber-500/25 disabled:pointer-events-none disabled:opacity-50 dark:text-amber-400",
                        index > 0 && "border-t border-dashed border-amber-500/40"
                      )}
                    >
                      <span className="flex w-full items-center justify-between gap-1.5">
                        <strong className="min-w-0 text-[11px] leading-tight font-semibold break-words">
                          {sob.turno!.nombreYApellido}
                        </strong>
                        {sob.turno!.origen === "ONLINE" && (
                          <OnlineBadge className="hidden sm:inline-block" />
                        )}
                      </span>
                      <span className="text-[10px] leading-tight opacity-80">
                        [ {formatHora(sob.inicio)} - {formatHora(sob.fin)} ] · Sobreturno
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {standaloneSobreturnos.map((slot) => {
          const top = ((minutesFromMidnight(slot.inicio) - startMinutes) / totalMinutes) * 100;
          const height =
            ((minutesFromMidnight(slot.fin) - minutesFromMidnight(slot.inicio)) / totalMinutes) *
            100;

          return (
            <button
              key={`sobreturno-${slot.inicio}`}
              type="button"
              disabled={isPastDay}
              onClick={() => onOpenEdit(slot)}
              style={{ top: `${top}%`, height: `${height}%`, minHeight: 44 }}
              aria-label={`Sobreturno de ${slot.turno!.nombreYApellido}, ${formatHora(slot.inicio)} a ${formatHora(slot.fin)}${isPastDay ? "." : ". Editar."}`}
              className="absolute left-1 flex w-[calc(100%-0.5rem)] flex-col justify-center gap-0.5 rounded-md border border-dashed border-amber-500/70 bg-amber-500/15 py-1 pr-2 pl-6 text-left text-amber-800 shadow-sm transition-colors hover:bg-amber-500/25 disabled:pointer-events-none disabled:opacity-50 dark:text-amber-400"
            >
              <span className="flex items-center justify-between gap-1.5">
                <strong className="min-w-0 text-xs leading-tight font-semibold break-words">
                  {slot.turno!.nombreYApellido}
                </strong>
                {slot.turno!.origen === "ONLINE" && <OnlineBadge />}
              </span>
              <span className="flex items-center gap-2 text-[11px] leading-tight opacity-80">
                <span className="shrink-0">
                  [ {formatHora(slot.inicio)} - {formatHora(slot.fin)} ] · Sobreturno
                </span>
                {role === "DOCTOR" && slot.turno!.patientId && (
                  <Link
                    href={`/patients/${slot.turno!.patientId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 underline-offset-2 hover:underline"
                  >
                    Ver ficha
                  </Link>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {showNowLine && (
        <div
          className="pointer-events-none absolute left-12 z-10 flex w-[calc(100%-3rem)] items-center"
          style={{ top: `${nowOffsetPct}%` }}
        >
          <span className="-ml-1 size-2 shrink-0 rounded-full bg-destructive" />
          <div className="h-px flex-1 bg-destructive" />
        </div>
      )}
    </div>
  );
}

// La grilla de un lugar entero -- se usa una vez por cada grupo de
// `agruparPorLugar` (o una sola vez, sin agrupar, cuando el médico tiene un
// único lugar). Si ese lugar tiene más de un tramo de horario ese día,
// cada uno se dibuja por separado (ver `BloqueContiguoGrid`), apilados con
// una línea divisoria entre ellos en vez de un único eje horario continuo
// que dejaría un hueco vacío enorme entre ambos.
function LugarDayGrid({
  slots,
  sobreturnos,
  role,
  isPastDay,
  isToday,
  onOpenEdit,
  onOpenBooking,
}: {
  slots: Slot[];
  sobreturnos: Slot[];
  role: UserRole;
  isPastDay: boolean;
  isToday: boolean;
  onOpenEdit: (slot: Slot) => void;
  onOpenBooking: (slot: Slot) => void;
}) {
  if (slots.length === 0) return null;

  const bloques = partirEnBloquesContiguos(slots);
  if (bloques.length <= 1) {
    return (
      <BloqueContiguoGrid
        slots={slots}
        sobreturnos={sobreturnos}
        role={role}
        isPastDay={isPastDay}
        isToday={isToday}
        onOpenEdit={onOpenEdit}
        onOpenBooking={onOpenBooking}
      />
    );
  }

  const tramos = bloques.map((bloqueSlots) => ({
    inicio: bloqueSlots[0].inicio,
    fin: bloqueSlots[bloqueSlots.length - 1].fin,
  }));
  const sobreturnosPorTramo = asignarSobreturnosATramos(tramos, sobreturnos);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {bloques.map((bloqueSlots, index) => {
        return (
          <div key={bloqueSlots[0].inicio}>
            {index > 0 && <hr className="my-6 border-t border-muted-foreground/30" />}
            <BloqueContiguoGrid
              slots={bloqueSlots}
              sobreturnos={sobreturnosPorTramo[index]}
              role={role}
              isPastDay={isPastDay}
              isToday={isToday}
              onOpenEdit={onOpenEdit}
              onOpenBooking={onOpenBooking}
            />
          </div>
        );
      })}
    </div>
  );
}

type Props = {
  role: UserRole;
  // Identifican de quién son los turnos que se están mostrando -- una
  // secretaria puede cambiar de médico y/o de lugar activo sin salir de
  // esta pantalla (ver doctor-switcher.tsx/lugar-switcher.tsx en el
  // header). El efecto más abajo los usa para refetchear sin resetear el
  // día que se está mirando.
  tenantId: string;
  activeLugarId?: string | null;
  initialDate: string;
  initialSlots: Slot[];
  initialSobreturnos: Slot[];
  initialSinConfigurar: boolean;
  initialDiasConHorario: DiaSemana[];
  initialSobreturnosHabilitados: boolean;
  initialLugares: LugarInfo[];
};

export function TurnosCalendar({
  role,
  tenantId,
  activeLugarId,
  initialDate,
  initialSlots,
  initialSobreturnos,
  initialSinConfigurar,
  initialDiasConHorario,
  initialSobreturnosHabilitados,
  initialLugares,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    () => dateParamToDateBA(initialDate) ?? new Date()
  );
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [sobreturnos, setSobreturnos] = useState<Slot[]>(initialSobreturnos);
  const [sinConfigurar, setSinConfigurar] = useState(initialSinConfigurar);
  const [diasConHorario, setDiasConHorario] = useState<DiaSemana[]>(initialDiasConHorario);
  const [sobreturnosHabilitados, setSobreturnosHabilitados] = useState(
    initialSobreturnosHabilitados
  );
  const [lugares, setLugares] = useState<LugarInfo[]>(initialLugares);
  const [loading, setLoading] = useState(false);
  // En mobile arranca colapsado para no ocupar toda la pantalla con el
  // calendario -- en desktop (lg+) siempre se muestra, sin importar este
  // estado (ver el className del contenedor más abajo).
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [formSlot, setFormSlot] = useState<Slot | null>(null);
  const [editingTurnoId, setEditingTurnoId] = useState<string | null>(null);
  const [nombreYApellido, setNombreYApellido] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [obraSocial, setObraSocial] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<Slot | null>(null);
  const [cancelling, setCancelling] = useState(false);

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

  const todayStart = startOfDayBA(new Date());

  async function loadSlots(date: Date) {
    setLoading(true);
    try {
      const response = await fetch(`/api/turnos?date=${formatDateParamBA(date)}`);
      const data = await response.json();
      setSlots(data.slots ?? []);
      setSobreturnos(data.sobreturnos ?? []);
      setSinConfigurar(Boolean(data.sinConfigurar));
      setDiasConHorario(data.diasConHorario ?? []);
      setSobreturnosHabilitados(Boolean(data.sobreturnosHabilitados));
      setLugares(data.lugares ?? []);
    } finally {
      setLoading(false);
    }
  }

  // Cambiar de médico o de lugar activo (secretaria) no debe hacer perder
  // el día que se está mirando -- solo hay que traer de nuevo los turnos de
  // ESE día, pero para el nuevo médico/lugar. `selectedDateRef` evita que
  // este efecto dependa de `selectedDate` (que ya se refetchea solo al
  // navegar de día) y solo dispare ante un cambio real de médico/lugar.
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  });
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadSlots(selectedDateRef.current);
  }, [tenantId, activeLugarId]);

  async function handleSelectDate(date: Date | undefined) {
    if (!date) return;
    setSelectedDate(date);
    await loadSlots(date);
  }

  function openBooking(slot: Slot) {
    setFormSlot(slot);
    setEditingTurnoId(null);
    setNombreYApellido("");
    setDni("");
    setTelefono("");
    setObraSocial("");
    setError(null);
    setTriedSubmit(false);
  }

  function openEdit(slot: Slot) {
    if (!slot.turno) return;
    setFormSlot(slot);
    setEditingTurnoId(slot.turno.id);
    setNombreYApellido(slot.turno.nombreYApellido);
    setDni(slot.turno.dni ?? "");
    setTelefono(slot.turno.telefono);
    setObraSocial(slot.turno.obraSocial ?? "");
    setError(null);
    setTriedSubmit(false);
  }

  async function handleSubmitForm() {
    if (!formSlot) return;
    if (!nombreYApellido.trim() || !dni.trim() || !telefono.trim()) {
      setTriedSubmit(true);
      setError("Completá nombre, DNI y teléfono.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(
        editingTurnoId ? `/api/turnos/${editingTurnoId}` : "/api/turnos",
        {
          method: editingTurnoId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inicio: formSlot.inicio,
            nombreYApellido,
            dni,
            telefono,
            obraSocial,
            ...(editingTurnoId ? {} : { lugarId: formSlot.lugarId }),
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el turno.");
        return;
      }
      setFormSlot(null);
      await loadSlots(selectedDate);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelar() {
    if (!cancelTarget?.turno) return;
    setCancelling(true);
    try {
      await fetch(`/api/turnos/${cancelTarget.turno.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "CANCELADO" }),
      });
      setCancelTarget(null);
      await loadSlots(selectedDate);
    } finally {
      setCancelling(false);
    }
  }

  function bloqueActivo(): BloqueDelDia | undefined {
    return bloques.find((b) => b.key === sobreturnoBloqueKey);
  }

  // El slot (normal o sobreturno) que termina más tarde DENTRO de ese
  // bloque -- `null` si todavía no hay ningún turno agendado ahí, en cuyo
  // caso "al final" no tiene sentido (la lista está vacía) y esa opción se
  // deshabilita.
  function ultimoSlotDelBloque(bloque: BloqueDelDia | undefined): Slot | null {
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
  function ocupadosDelBloque(bloque: BloqueDelDia | undefined): Slot[] {
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

  const today = new Date();
  const isToday = isSameDayBA(selectedDate, today);
  const isPastDay = selectedDate < todayStart;

  const lugaresPorId = new Map(lugares.map((l) => [l.id, l]));
  const grupos = agruparPorLugar(slots, sobreturnos);
  const bloques = bloquesDelDia(grupos);
  // Se muestra el encabezado de cada tarjeta apenas el médico tiene más de
  // una práctica configurada -- aunque ese día en particular solo una tenga
  // horarios cargados -- para que quede claro a qué lugar corresponde sin
  // tener que ir día por día hasta encontrar uno con dos. El caso común (un
  // solo lugar, o ninguno todavía asignado) se sigue viendo exactamente
  // igual que antes de esta feature.
  const mostrarEncabezadosPorLugar = lugares.length > 1;
  const bloqueSobreturno = bloqueActivo();
  const ocupadosBloqueSobreturno = ocupadosDelBloque(bloqueSobreturno);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <div className="flex flex-1 min-h-0 flex-col gap-6 lg:flex-row">
        <div className="flex flex-col gap-3 lg:self-start">
          <Card>
            <CardContent className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setCalendarOpen((open) => !open)}
                className="flex items-center justify-between gap-2 text-sm font-medium lg:hidden"
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-4" />
                  {capitalize(
                    selectedDate.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
                  )}
                </span>
                <ChevronDown
                  className={cn("size-4 transition-transform", calendarOpen && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "justify-center lg:flex",
                  calendarOpen ? "flex" : "hidden"
                )}
              >
                <Calendar
                  mode="single"
                  locale={es}
                  formatters={{
                    formatCaption: (month, options) =>
                      capitalize(defaultFormatCaption(month, options)),
                    formatWeekdayName: (weekday, options) =>
                      capitalize(defaultFormatWeekdayName(weekday, options)),
                  }}
                  selected={selectedDate}
                  onSelect={handleSelectDate}
                  disabled={(date) => !diasConHorario.includes(diaSemanaFromDate(date))}
                  modifiers={{ past: (date) => date < todayStart }}
                  modifiersClassNames={{ past: "text-muted-foreground opacity-50" }}
                />
              </div>
            </CardContent>
          </Card>
          {sobreturnosHabilitados && (
            <Button
              type="button"
              className="w-full"
              disabled={isPastDay}
              onClick={openSobreturnoDialog}
            >
              + Sobreturno
            </Button>
          )}
        </div>

        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <div className="flex shrink-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSelectDate(nextDiaConHorario(selectedDate, -1, diasConHorario))}
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <h2 className="min-w-0 flex-1 truncate text-center text-xs font-semibold sm:text-lg">
              {capitalize(
                selectedDate.toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              )}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSelectDate(nextDiaConHorario(selectedDate, 1, diasConHorario))}
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {(() => {
            // Con más de una práctica configurada, cada lugar ya es su
            // propia tarjeta con su propio borde -- envolverlas además en
            // la caja blanca de siempre era una caja dentro de otra caja,
            // de más. Sin esa envoltura, quedan directamente apoyadas
            // sobre el fondo de la página (igual que en el mockup
            // aprobado). Con un solo lugar (el caso común) se mantiene la
            // caja blanca de toda la vida, sin cambios.
            const contenido = (
              <>
                {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}

                {!loading && sinConfigurar && (
                  <p className="text-sm text-muted-foreground">
                    Todavía no se configuró el horario de trabajo.
                  </p>
                )}

                {!loading && !sinConfigurar && slots.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay horario configurado para este día.
                  </p>
                )}

                {!loading && slots.length > 0 && (
                  <div className="flex flex-1 min-h-0 flex-col gap-5">
                    {grupos.map((grupo) => {
                      const lugar = lugaresPorId.get(grupo.lugarId);
                      const todosLosItems = [...grupo.slots, ...grupo.sobreturnos];
                      const primerInicio = todosLosItems.reduce(
                        (min, s) => (s.inicio < min ? s.inicio : min),
                        todosLosItems[0]?.inicio ?? ""
                      );
                      const ultimoFin = todosLosItems.reduce(
                        (max, s) => (s.fin > max ? s.fin : max),
                        todosLosItems[0]?.fin ?? ""
                      );

                      return (
                        <div
                          key={grupo.lugarId}
                          className={cn(
                            "flex min-h-0 flex-col",
                            mostrarEncabezadosPorLugar
                              ? "flex-none overflow-hidden rounded-xl border border-border bg-card"
                              : "flex-1"
                          )}
                        >
                          {mostrarEncabezadosPorLugar && (
                            <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
                              <LugarIcon tipo={lugar?.tipo} />
                              <span className="text-sm font-semibold text-foreground">
                                {lugarNombre(lugar)}
                              </span>
                              {lugar && (
                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                                  {tipoLabel(lugar.tipo)}
                                </span>
                              )}
                              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                {formatHora(primerInicio)} – {formatHora(ultimoFin)}
                              </span>
                            </div>
                          )}
                          <div
                            className={cn(
                              "flex flex-1 min-h-0 flex-col",
                              mostrarEncabezadosPorLugar && "px-2 pt-4 pb-3 lg:px-(--card-spacing)"
                            )}
                          >
                            <LugarDayGrid
                              slots={grupo.slots}
                              sobreturnos={grupo.sobreturnos}
                              role={role}
                              isPastDay={isPastDay}
                              isToday={isToday}
                              onOpenEdit={openEdit}
                              onOpenBooking={openBooking}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );

            return mostrarEncabezadosPorLugar ? (
              <div className="flex flex-1 min-h-0 flex-col">{contenido}</div>
            ) : (
              <Card className="-mx-4 flex-1 min-h-0 rounded-none border-0 bg-card py-0 shadow-none lg:mx-0 lg:rounded-xl lg:border lg:border-border lg:py-(--card-spacing) lg:shadow-sm">
                <CardContent className="flex flex-1 min-h-0 flex-col px-2 pt-2 lg:px-(--card-spacing) lg:pt-3">
                  {contenido}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>

      <Dialog open={formSlot !== null} onOpenChange={(open) => !open && setFormSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTurnoId ? "Editar turno" : "Reservar turno"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label>Día</Label>
                <strong className="text-sm">
                  {selectedDate.toLocaleDateString("es-AR")}
                </strong>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Hora</Label>
                <strong className="text-sm">
                  {formSlot && `${formatHora(formSlot.inicio)} a ${formatHora(formSlot.fin)}`}
                </strong>
              </div>
            </div>
            <hr className="mt-2 mb-2" />
            <div className="flex flex-col gap-1.5">
              <Label>Nombre completo *</Label>
              <Input
                value={nombreYApellido}
                onChange={(e) => setNombreYApellido(e.target.value)}
                className={
                  triedSubmit && !nombreYApellido.trim() ? "border-destructive" : undefined
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>DNI *</Label>
                <Input
                  inputMode="numeric"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                  className={triedSubmit && !dni.trim() ? "border-destructive" : undefined}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Teléfono *</Label>
                <Input
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) => setTelefono(filterTelefono(e.target.value))}
                  className={triedSubmit && !telefono.trim() ? "border-destructive" : undefined}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Obra Social</Label>
              <Input value={obraSocial} onChange={(e) => setObraSocial(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className={editingTurnoId ? "sm:justify-between" : undefined}>
            {editingTurnoId && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setCancelTarget(formSlot);
                  setFormSlot(null);
                }}
              >
                Cancelar turno
              </Button>
            )}
            <Button type="button" onClick={handleSubmitForm} disabled={saving}>
              {saving
                ? editingTurnoId
                  ? "Guardando..."
                  : "Reservando..."
                : editingTurnoId
                  ? "Guardar"
                  : "Reservar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar turno</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            {cancelTarget?.turno && (
              <>
                ¿Cancelar el turno de <strong>{cancelTarget.turno.nombreYApellido}</strong> del{" "}
                {selectedDate.toLocaleDateString("es-AR")} a las {formatHora(cancelTarget.inicio)}?
              </>
            )}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelTarget(null)}>
              Volver
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelar}
              disabled={cancelling}
            >
              {cancelling ? "Cancelando..." : "Cancelar turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sobreturnoOpen} onOpenChange={(open) => !open && setSobreturnoOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar sobreturno</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label>Día</Label>
              <strong className="text-sm">{selectedDate.toLocaleDateString("es-AR")}</strong>
            </div>

            {bloques.length > 1 && (
              <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/50 p-3">
                <Label>¿En qué bloque de horario?</Label>
                <RadioGroup
                  value={sobreturnoBloqueKey}
                  onValueChange={(v) => elegirBloqueSobreturno(v ?? "")}
                  className="flex flex-col gap-2.5"
                >
                  {bloques.map((bloque) => (
                    <div key={bloque.key} className="flex items-center gap-2">
                      <RadioGroupItem value={bloque.key} id={`sobreturno-bloque-${bloque.key}`} />
                      <Label
                        htmlFor={`sobreturno-bloque-${bloque.key}`}
                        className="font-normal"
                      >
                        {lugarNombre(lugaresPorId.get(bloque.lugarId))}
                        <span className="text-muted-foreground">
                          {" "}
                          · {formatHora(bloque.inicio)} a {formatHora(bloque.fin)}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/50 p-3">
              <Label>¿Cuándo?</Label>
              <RadioGroup
                value={sobreturnoModo}
                onValueChange={(v) => setSobreturnoModo(v as "hora" | "final")}
                className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="hora"
                    id="sobreturno-modo-hora"
                    disabled={ocupadosBloqueSobreturno.length === 0}
                  />
                  <Label htmlFor="sobreturno-modo-hora" className="font-normal">
                    Junto a un turno
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="final"
                    id="sobreturno-modo-final"
                    disabled={!ultimoSlotDelBloque(bloqueSobreturno)}
                  />
                  <Label htmlFor="sobreturno-modo-final" className="font-normal">
                    Al final de este bloque
                  </Label>
                </div>
              </RadioGroup>
              {sobreturnoModo === "hora" && (
                <Select
                  value={sobreturnoTurnoId}
                  onValueChange={(v) => setSobreturnoTurnoId(v ?? "")}
                >
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue>
                      {(id: string) => {
                        const slot = ocupadosBloqueSobreturno.find((s) => s.turno!.id === id);
                        return slot
                          ? `${formatHora(slot.inicio)} - ${slot.turno!.nombreYApellido}`
                          : "Elegir turno...";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ocupadosBloqueSobreturno.map((slot) => (
                      <SelectItem key={slot.turno!.id} value={slot.turno!.id}>
                        {formatHora(slot.inicio)} - {slot.turno!.nombreYApellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <hr className="mt-2 mb-2" />
            <div className="flex flex-col gap-1.5">
              <Label>Nombre completo *</Label>
              <Input
                value={sobreturnoNombre}
                onChange={(e) => setSobreturnoNombre(e.target.value)}
                className={
                  sobreturnoTriedSubmit && !sobreturnoNombre.trim()
                    ? "border-destructive"
                    : undefined
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>DNI *</Label>
                <Input
                  inputMode="numeric"
                  value={sobreturnoDni}
                  onChange={(e) => setSobreturnoDni(e.target.value.replace(/\D/g, ""))}
                  className={
                    sobreturnoTriedSubmit && !sobreturnoDni.trim() ? "border-destructive" : undefined
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Teléfono *</Label>
                <Input
                  inputMode="numeric"
                  value={sobreturnoTelefono}
                  onChange={(e) => setSobreturnoTelefono(filterTelefono(e.target.value))}
                  className={
                    sobreturnoTriedSubmit && !sobreturnoTelefono.trim()
                      ? "border-destructive"
                      : undefined
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Obra Social</Label>
              <Input
                value={sobreturnoObraSocial}
                onChange={(e) => setSobreturnoObraSocial(e.target.value)}
              />
            </div>
            {sobreturnoError && <p className="text-sm text-destructive">{sobreturnoError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSubmitSobreturno} disabled={sobreturnoSaving}>
              {sobreturnoSaving ? "Agregando..." : "Agregar sobreturno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
