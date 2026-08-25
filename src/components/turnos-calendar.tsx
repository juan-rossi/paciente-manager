"use client";

import { useState } from "react";
import Link from "next/link";
import { es } from "date-fns/locale";
import {
  formatCaption as defaultFormatCaption,
  formatWeekdayName as defaultFormatWeekdayName,
} from "react-day-picker";
import { Calendar as CalendarIcon, User } from "lucide-react";
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
  fechaNacimiento: string;
  dni: string;
  obraSocial: string | null;
  obraSocialNro: string | null;
  patientId?: string | null;
};

type Slot = {
  inicio: string;
  fin: string;
  turno: TurnoInfo | null;
};

function toDateParam(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatHora(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
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
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [dni, setDni] = useState("");
  const [obraSocial, setObraSocial] = useState("");
  const [obraSocialNro, setObraSocialNro] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<Slot | null>(null);
  const [cancelling, setCancelling] = useState(false);

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
    setFechaNacimiento("");
    setDni("");
    setObraSocial("");
    setObraSocialNro("");
    setError(null);
  }

  async function handleReservar() {
    if (!bookingSlot) return;
    if (!nombreYApellido.trim() || !fechaNacimiento || !dni.trim()) {
      setError("Completá nombre y apellido, fecha de nacimiento y DNI.");
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
          fechaNacimiento,
          dni,
          obraSocial,
          obraSocialNro,
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
      <Card className="h-fit">
        <CardContent className="pt-6">
          <Calendar
            mode="single"
            locale={es}
            formatters={{
              formatCaption: (month, options) => capitalize(defaultFormatCaption(month, options)),
              formatWeekdayName: (weekday, options) =>
                capitalize(defaultFormatWeekdayName(weekday, options)),
            }}
            selected={selectedDate}
            onSelect={handleSelectDate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarIcon className="size-4 text-primary" />
            {capitalize(
              selectedDate.toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            )}
          </h2>

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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {slots.map((slot) => (
              <div
                key={slot.inicio}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">
                    {formatHora(slot.inicio)} - {formatHora(slot.fin)}
                  </span>
                  {slot.turno ? (
                    <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <User className="size-3" />
                      {slot.turno.nombreYApellido} · DNI {slot.turno.dni}
                      {role === "DOCTOR" && slot.turno.patientId && (
                        <Link
                          href={`/patients/${slot.turno.patientId}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          Ver ficha
                        </Link>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Libre</span>
                  )}
                </div>
                {slot.turno ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelTarget(slot)}
                  >
                    Cancelar
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={() => openBooking(slot)}>
                    Reservar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={bookingSlot !== null} onOpenChange={(open) => !open && setBookingSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar turno</DialogTitle>
            {bookingSlot && (
              <DialogDescription>
                {selectedDate.toLocaleDateString("es-AR")} · {formatHora(bookingSlot.inicio)} a{" "}
                {formatHora(bookingSlot.fin)}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Nombre y Apellido *</Label>
              <Input
                value={nombreYApellido}
                onChange={(e) => setNombreYApellido(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Fecha de Nacimiento *</Label>
                <Input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>DNI *</Label>
                <Input
                  inputMode="numeric"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Obra Social</Label>
                <Input value={obraSocial} onChange={(e) => setObraSocial(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Nro Obra Social</Label>
                <Input value={obraSocialNro} onChange={(e) => setObraSocialNro(e.target.value)} />
              </div>
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
