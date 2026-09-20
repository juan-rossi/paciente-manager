"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { es } from "date-fns/locale";
import {
  formatCaption as defaultFormatCaption,
  formatWeekdayName as defaultFormatWeekdayName,
} from "react-day-picker";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { diaSemanaFromDate, type DiaSemana } from "@/lib/slots";
import {
  dateParamToDateBA,
  formatDateParamBA,
  formatHoraBA,
  getMinutesSinceMidnightBA,
  isSameDayBA,
  startOfDayBA,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";
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
};

type Slot = {
  inicio: string;
  fin: string;
  lugarId: string | null;
  turno: TurnoInfo | null;
};

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

// "Anterior"/"Siguiente" saltan directo al próximo día que de hecho tiene
// horario cargado (el mismo criterio que ya deshabilita los días sin
// horario en el date-picker de al lado) -- si no, uno podía terminar
// clickeando varias veces seguidas sobre días vacíos. Tope de 7 vueltas
// porque `diasConHorario` es un patrón semanal, nunca hace falta más.
function nextDiaConHorario(date: Date, direction: 1 | -1, diasConHorario: DiaSemana[]): Date {
  let candidate = addDays(date, direction);
  if (diasConHorario.length === 0) return candidate;
  for (let i = 0; i < 7; i++) {
    if (diasConHorario.includes(diaSemanaFromDate(candidate))) return candidate;
    candidate = addDays(candidate, direction);
  }
  return candidate;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
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

  // El slot (normal o sobreturno) que termina más tarde ese día -- `null` si
  // todavía no hay ningún turno agendado, en cuyo caso "al final de la
  // lista" no tiene sentido (la lista está vacía) y esa opción se deshabilita.
  function ultimoSlotDelDia(): Slot | null {
    const ocupados = [...slots.filter((s) => s.turno), ...sobreturnos];
    if (ocupados.length === 0) return null;
    return ocupados.reduce((max, s) =>
      new Date(s.fin).getTime() > new Date(max.fin).getTime() ? s : max
    );
  }

  function ultimoFinDelDia(): Date | null {
    const slot = ultimoSlotDelDia();
    return slot ? new Date(slot.fin) : null;
  }

  // Los turnos normales (no sobreturnos) ya ocupados ese día que todavía no
  // tienen un sobreturno propio -- de acá sale la lista del select "Junto a
  // un turno" (solo se permite un sobreturno por horario).
  function ocupadosDelDia(): Slot[] {
    const sobreturnoInicios = new Set(sobreturnos.map((s) => s.inicio));
    return slots.filter((s) => s.turno && !sobreturnoInicios.has(s.inicio));
  }

  function openSobreturnoDialog() {
    const finDelDia = ultimoFinDelDia();
    const ocupados = ocupadosDelDia();
    setSobreturnoModo(finDelDia ? "final" : "hora");
    setSobreturnoTurnoId(ocupados[0]?.turno?.id ?? "");
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

    let inicio: Date | null;
    let lugarId: string | null;
    if (sobreturnoModo === "final") {
      const ultimo = ultimoSlotDelDia();
      inicio = ultimo ? new Date(ultimo.fin) : null;
      lugarId = ultimo?.lugarId ?? null;
    } else {
      const turnoSlot = ocupadosDelDia().find((s) => s.turno!.id === sobreturnoTurnoId);
      inicio = turnoSlot ? new Date(turnoSlot.inicio) : null;
      lugarId = turnoSlot?.lugarId ?? null;
    }
    if (!inicio) {
      setSobreturnoError(
        sobreturnoModo === "final"
          ? "No hay turnos agendados para calcular el final del día."
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

  const { mergedRows, standalone: standaloneSobreturnos, consumedInicios } = mergeSobreturnos(
    slots,
    sobreturnos
  );
  const { startMinutes, endMinutes } = getGridRange([...slots, ...sobreturnos]);
  const totalMinutes = endMinutes - startMinutes;
  const today = new Date();
  const isToday = isSameDayBA(selectedDate, today);
  const isPastDay = selectedDate < todayStart;
  const nowOffsetPct = ((getMinutesSinceMidnightBA(today) - startMinutes) / totalMinutes) * 100;
  const showNowLine = isToday && nowOffsetPct >= 0 && nowOffsetPct <= 100;

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

          <Card className="-mx-4 flex-1 min-h-0 rounded-none border-0 bg-card py-0 shadow-none lg:mx-0 lg:rounded-xl lg:border lg:border-border lg:py-(--card-spacing) lg:shadow-sm">
            <CardContent className="flex flex-1 min-h-0 flex-col px-2 pt-[20px] lg:px-(--card-spacing) lg:pt-6">
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
                <div
                  className="relative flex-1 min-h-0"
                  style={{ minHeight: Math.max(slots.length * 44, 320) }}
                >
                  {slots.map((slot) => {
                    const top =
                      ((minutesFromMidnight(slot.inicio) - startMinutes) / totalMinutes) * 100;
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
                      const top =
                        ((minutesFromMidnight(slot.inicio) - startMinutes) / totalMinutes) * 100;
                      const height =
                        ((minutesFromMidnight(slot.fin) - minutesFromMidnight(slot.inicio)) /
                          totalMinutes) *
                        100;
                      const ocupado = Boolean(slot.turno);

                      return (
                        <button
                          key={slot.inicio}
                          type="button"
                          disabled={isPastDay}
                          onClick={() => (slot.turno ? openEdit(slot) : openBooking(slot))}
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
                              <strong className="text-xs leading-tight font-semibold break-words">
                                {slot.turno!.nombreYApellido}
                              </strong>
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
                      const pieces = [...row.leftPieces].sort((a, b) =>
                        a.inicio.localeCompare(b.inicio)
                      );
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
                                    onClick={() => (piece.turno ? openEdit(piece) : openBooking(piece))}
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
                                        <strong className="text-[11px] leading-tight font-semibold break-words">
                                          {piece.turno!.nombreYApellido}
                                        </strong>
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
                                  onClick={() => openEdit(sob)}
                                  aria-label={`Sobreturno de ${sob.turno!.nombreYApellido}, ${formatHora(sob.inicio)} a ${formatHora(sob.fin)}${isPastDay ? "." : ". Editar."}`}
                                  className={cn(
                                    "flex w-full flex-1 flex-col items-start justify-center bg-amber-500/15 px-2 py-1 text-left text-amber-800 transition-colors hover:bg-amber-500/25 disabled:pointer-events-none disabled:opacity-50 dark:text-amber-400",
                                    index > 0 && "border-t border-dashed border-amber-500/40"
                                  )}
                                >
                                  <strong className="text-[11px] leading-tight font-semibold break-words">
                                    {sob.turno!.nombreYApellido}
                                  </strong>
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
                      const top =
                        ((minutesFromMidnight(slot.inicio) - startMinutes) / totalMinutes) * 100;
                      const height =
                        ((minutesFromMidnight(slot.fin) - minutesFromMidnight(slot.inicio)) /
                          totalMinutes) *
                        100;

                      return (
                        <button
                          key={`sobreturno-${slot.inicio}`}
                          type="button"
                          disabled={isPastDay}
                          onClick={() => openEdit(slot)}
                          style={{ top: `${top}%`, height: `${height}%`, minHeight: 44 }}
                          aria-label={`Sobreturno de ${slot.turno!.nombreYApellido}, ${formatHora(slot.inicio)} a ${formatHora(slot.fin)}${isPastDay ? "." : ". Editar."}`}
                          className="absolute left-1 flex w-[calc(100%-0.5rem)] flex-col justify-center gap-0.5 rounded-md border border-dashed border-amber-500/70 bg-amber-500/15 py-1 pr-2 pl-6 text-left text-amber-800 shadow-sm transition-colors hover:bg-amber-500/25 disabled:pointer-events-none disabled:opacity-50 dark:text-amber-400"
                        >
                          <strong className="text-xs leading-tight font-semibold break-words">
                            {slot.turno!.nombreYApellido}
                          </strong>
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
              )}
            </CardContent>
          </Card>
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
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
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
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label>Día</Label>
              <strong className="text-sm">{selectedDate.toLocaleDateString("es-AR")}</strong>
            </div>

            <div className="flex flex-col gap-1.5">
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
                    disabled={ocupadosDelDia().length === 0}
                  />
                  <Label htmlFor="sobreturno-modo-hora" className="font-normal">
                    Junto a un turno
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="final"
                    id="sobreturno-modo-final"
                    disabled={!ultimoFinDelDia()}
                  />
                  <Label htmlFor="sobreturno-modo-final" className="font-normal">
                    Al final de la lista
                  </Label>
                </div>
              </RadioGroup>
              {sobreturnoModo === "hora" && (
                <Select
                  value={sobreturnoTurnoId}
                  onValueChange={(v) => setSobreturnoTurnoId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(id: string) => {
                        const slot = ocupadosDelDia().find((s) => s.turno!.id === id);
                        return slot
                          ? `${formatHora(slot.inicio)} - ${slot.turno!.nombreYApellido}`
                          : "Elegir turno...";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ocupadosDelDia().map((slot) => (
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
                  value={sobreturnoTelefono}
                  onChange={(e) => setSobreturnoTelefono(e.target.value)}
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
