"use client";

import { useState } from "react";
import Link from "next/link";
import { es } from "date-fns/locale";
import {
  formatCaption as defaultFormatCaption,
  formatWeekdayName as defaultFormatWeekdayName,
} from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  turno: TurnoInfo | null;
};

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
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
  role: "DOCTOR" | "SECRETARY";
  initialDate: string;
  initialSlots: Slot[];
  initialSinConfigurar: boolean;
  diasConHorario: DiaSemana[];
};

export function TurnosCalendar({
  role,
  initialDate,
  initialSlots,
  initialSinConfigurar,
  diasConHorario,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    () => dateParamToDateBA(initialDate) ?? new Date()
  );
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [sinConfigurar, setSinConfigurar] = useState(initialSinConfigurar);
  const [loading, setLoading] = useState(false);

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

  const todayStart = startOfDayBA(new Date());

  async function loadSlots(date: Date) {
    setLoading(true);
    try {
      const response = await fetch(`/api/turnos?date=${formatDateParamBA(date)}`);
      const data = await response.json();
      setSlots(data.slots ?? []);
      setSinConfigurar(Boolean(data.sinConfigurar));
    } finally {
      setLoading(false);
    }
  }

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
    if (!nombreYApellido.trim() || !telefono.trim()) {
      setTriedSubmit(true);
      setError("Completá nombre y teléfono.");
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

  const { startMinutes, endMinutes } = getGridRange(slots);
  const totalMinutes = endMinutes - startMinutes;
  const today = new Date();
  const isToday = isSameDayBA(selectedDate, today);
  const isPastDay = selectedDate < todayStart;
  const nowOffsetPct = ((getMinutesSinceMidnightBA(today) - startMinutes) / totalMinutes) * 100;
  const showNowLine = isToday && nowOffsetPct >= 0 && nowOffsetPct <= 100;

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <div className="flex flex-1 min-h-0 flex-col gap-6 lg:flex-row">
        <Card className="lg:self-start">
          <CardContent className="pt-2">
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
          </CardContent>
        </Card>

        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <div className="flex shrink-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSelectDate(addDays(selectedDate, -1))}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <h2 className="flex-1 text-center text-lg font-semibold">
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
              onClick={() => handleSelectDate(addDays(selectedDate, 1))}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Card className="flex-1 min-h-0">
            <CardContent className="flex flex-1 min-h-0 flex-col pt-6">
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
                <div className="relative flex-1 min-h-0">
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
                          style={{ top: `${top}%`, height: `${height}%`, minHeight: 22 }}
                          aria-label={
                            ocupado
                              ? `Turno de ${slot.turno!.nombreYApellido}, ${formatHora(slot.inicio)} a ${formatHora(slot.fin)}${isPastDay ? "." : ". Editar."}`
                              : `Libre, ${formatHora(slot.inicio)} a ${formatHora(slot.fin)}${isPastDay ? "." : ". Reservar."}`
                          }
                          className={cn(
                            "absolute left-1 w-[calc(100%-0.5rem)] flex items-center gap-1 overflow-hidden rounded-md border py-1 pr-2 pl-6 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
                            ocupado
                              ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/25"
                              : "border-dashed border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/40 hover:text-foreground"
                          )}
                        >
                          <strong className="truncate text-xs font-semibold">
                            {ocupado ? slot.turno!.nombreYApellido : "Libre"}
                          </strong>
                          <span className="shrink-0 truncate text-xs">
                            [ {formatHora(slot.inicio)} - {formatHora(slot.fin)} ]
                          </span>
                          {ocupado && role === "DOCTOR" && slot.turno!.patientId && (
                            <Link
                              href={`/patients/${slot.turno!.patientId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 truncate text-xs underline-offset-2 hover:underline"
                            >
                              Ver ficha
                            </Link>
                          )}
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
                <Label>DNI</Label>
                <Input
                  inputMode="numeric"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
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
    </div>
  );
}
