"use client";

import { useState } from "react";
import Link from "next/link";
import { es } from "date-fns/locale";
import {
  formatCaption as defaultFormatCaption,
  formatWeekdayName as defaultFormatWeekdayName,
} from "react-day-picker";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TurnoInfo = {
  id: string;
  nombreYApellido: string;
  fechaNacimiento: string | null;
  dni: string;
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

function toDateParam(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatHora(iso: string) {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function minutesFromMidnight(iso: string) {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

function getGridRange(slots: Slot[]) {
  if (slots.length === 0) return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  const starts = slots.map((s) => minutesFromMidnight(s.inicio));
  const ends = slots.map((s) => minutesFromMidnight(s.fin));
  const startHour = Math.floor(Math.min(...starts) / 60);
  const endHour = Math.ceil(Math.max(...ends) / 60);
  return { startHour, endHour: Math.max(endHour, startHour + 1) };
}

type Props = {
  role: "DOCTOR" | "SECRETARY";
  initialDate: string;
  initialSlots: Slot[];
  initialSinConfigurar: boolean;
};

export function TurnosCalendar({ role, initialDate, initialSlots, initialSinConfigurar }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(`${initialDate}T00:00:00`));
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [sinConfigurar, setSinConfigurar] = useState(initialSinConfigurar);
  const [loading, setLoading] = useState(false);

  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);
  const [nombreYApellido, setNombreYApellido] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [obraSocial, setObraSocial] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<Slot | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  async function loadSlots(date: Date) {
    setLoading(true);
    try {
      const response = await fetch(`/api/turnos?date=${toDateParam(date)}`);
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
    setBookingSlot(slot);
    setNombreYApellido("");
    setDni("");
    setTelefono("");
    setObraSocial("");
    setError(null);
    setTriedSubmit(false);
  }

  async function handleReservar() {
    if (!bookingSlot) return;
    if (!nombreYApellido.trim() || !dni.trim() || !telefono.trim()) {
      setTriedSubmit(true);
      setError("Completá nombre y apellido, DNI y teléfono.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inicio: bookingSlot.inicio,
          nombreYApellido,
          dni,
          telefono,
          obraSocial,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo reservar el turno.");
        return;
      }
      setBookingSlot(null);
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

  const { startHour, endHour } = getGridRange(slots);
  const totalHours = endHour - startHour;
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);
  const isPastDay = selectedDate < todayStart;
  const nowOffsetPct =
    (((today.getHours() - startHour) * 60 + today.getMinutes()) / 60 / totalHours) * 100;
  const showNowLine = isToday && nowOffsetPct >= 0 && nowOffsetPct <= 100;

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => handleSelectDate(new Date())}>
          Hoy
        </Button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSelectDate(addDays(selectedDate, -1))}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Día anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => handleSelectDate(addDays(selectedDate, 1))}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Día siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <h2 className="text-lg font-semibold">
          {capitalize(
            selectedDate.toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          )}
        </h2>
      </div>

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
              modifiers={{ past: (date) => date < todayStart }}
              modifiersClassNames={{ past: "text-muted-foreground opacity-50" }}
            />
          </CardContent>
        </Card>

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
                    ((minutesFromMidnight(slot.inicio) - startHour * 60) / 60 / totalHours) * 100;
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
                      (((minutesFromMidnight(slot.inicio) - startHour * 60) / 60) / totalHours) *
                      100;
                    const height =
                      (((minutesFromMidnight(slot.fin) - minutesFromMidnight(slot.inicio)) / 60) /
                        totalHours) *
                      100;
                    const ocupado = Boolean(slot.turno);

                    return (
                      <button
                        key={slot.inicio}
                        type="button"
                        disabled={isPastDay}
                        onClick={() => (slot.turno ? setCancelTarget(slot) : openBooking(slot))}
                        style={{ top: `${top}%`, height: `${height}%`, minHeight: 22 }}
                        aria-label={
                          ocupado
                            ? `Turno de ${slot.turno!.nombreYApellido}, ${formatHora(slot.inicio)} a ${formatHora(slot.fin)}${isPastDay ? "." : ". Cancelar."}`
                            : `Libre, ${formatHora(slot.inicio)} a ${formatHora(slot.fin)}${isPastDay ? "." : ". Reservar."}`
                        }
                        className={cn(
                          "absolute left-1 w-[calc(100%-0.5rem)] flex overflow-hidden rounded-md border px-2 py-1 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
                          ocupado
                            ? "flex-col border-primary/30 bg-primary/15 text-primary hover:bg-primary/25"
                            : "items-center border-dashed border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/40 hover:text-foreground"
                        )}
                      >
                        {ocupado ? (
                          <>
                            <span className="truncate text-xs font-semibold">
                              {formatHora(slot.inicio)} - {formatHora(slot.fin)}
                            </span>
                            <span className="flex items-center gap-1 truncate text-xs">
                              <User className="size-3 shrink-0" />
                              {slot.turno!.nombreYApellido}
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
                          <span className="truncate text-xs">Libre</span>
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

      <Dialog open={bookingSlot !== null} onOpenChange={(open) => !open && setBookingSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar turno</DialogTitle>
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
                  {bookingSlot &&
                    `${formatHora(bookingSlot.inicio)} a ${formatHora(bookingSlot.fin)}`}
                </strong>
              </div>
            </div>
            <hr className="mt-2 mb-2" />
            <div className="flex flex-col gap-1.5">
              <Label>Nombre y Apellido *</Label>
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
          <DialogFooter>
            <Button type="button" onClick={handleReservar} disabled={saving}>
              {saving ? "Reservando..." : "Reservar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar turno</DialogTitle>
            <DialogDescription>
              {cancelTarget?.turno && (
                <>
                  Se cancelará el turno de <strong>{cancelTarget.turno.nombreYApellido}</strong> del{" "}
                  {selectedDate.toLocaleDateString("es-AR")} a las {formatHora(cancelTarget.inicio)}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
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
