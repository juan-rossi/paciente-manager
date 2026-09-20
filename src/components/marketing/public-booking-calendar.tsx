"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatHoraBA, TIME_ZONE } from "@/lib/timezone";

type HorarioDisponible = { inicio: string; lugarId: string | null };
type DisponibilidadDia = { fecha: string; horarios: HorarioDisponible[] };

function formatDiaChip(fecha: string): string {
  const date = new Date(`${fecha}T12:00:00`);
  const label = date.toLocaleDateString("es-AR", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

function formatDiaCompleto(fecha: string): string {
  const date = new Date(`${fecha}T12:00:00`);
  const label = date.toLocaleDateString("es-AR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function PublicBookingCalendar({ slug }: { slug: string }) {
  const [dias, setDias] = useState<DisponibilidadDia[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [horarioElegido, setHorarioElegido] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<{ fecha: string; hora: string } | null>(null);

  const [nombreYApellido, setNombreYApellido] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [obraSocial, setObraSocial] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarDisponibilidad() {
    try {
      const response = await fetch(`/api/directorio/${slug}/disponibilidad`);
      if (!response.ok) {
        setLoadError("No se pudo cargar la disponibilidad.");
        return;
      }
      const data = await response.json();
      const dias: DisponibilidadDia[] = data.dias ?? [];
      setDias(dias);
      const primerDiaConHorarios = dias.find((d) => d.horarios.length > 0);
      setFechaSeleccionada((primerDiaConHorarios ?? dias[0])?.fecha ?? null);
    } catch {
      setLoadError("No se pudo conectar con el servidor.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDisponibilidad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function abrirFormulario(horario: string) {
    setHorarioElegido(horario);
    setNombreYApellido("");
    setDni("");
    setTelefono("");
    setObraSocial("");
    setTriedSubmit(false);
    setError(null);
  }

  async function handleSubmitForm() {
    setTriedSubmit(true);
    if (!nombreYApellido.trim() || !dni.trim() || !telefono.trim() || !horarioElegido) {
      setError("Completá los campos obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/directorio/${slug}/reservar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inicio: horarioElegido,
          nombreYApellido,
          dni,
          telefono,
          obraSocial: obraSocial || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "No se pudo reservar el turno.");
        if (response.status === 409) {
          await cargarDisponibilidad();
        }
        return;
      }
      const fecha = fechaSeleccionada ?? "";
      const hora = formatHoraBA(new Date(horarioElegido));
      setHorarioElegido(null);
      setConfirmado({ fecha, hora });
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  if (confirmado) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-accent/30 bg-brand-accent/5 p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-accent text-white">
          <CalendarDays className="size-6" />
        </span>
        <h2 className="font-heading text-lg font-bold">¡Turno reservado!</h2>
        <p className="text-sm text-muted-foreground">
          Tu turno quedó confirmado para el <strong>{formatDiaCompleto(confirmado.fecha)}</strong> a
          las <strong>{confirmado.hora}hs</strong>.
        </p>
      </div>
    );
  }

  if (loadError) {
    return <p className="text-sm text-muted-foreground">{loadError}</p>;
  }

  if (!dias) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando disponibilidad...
      </div>
    );
  }

  const diaActivo = dias.find((d) => d.fecha === fechaSeleccionada) ?? null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-accent text-white">
          <CalendarDays className="size-4.5" />
        </span>
        <span className="font-heading text-[15px] font-bold">Reservar turno online</span>
      </div>

      <span className="mt-4 block text-sm font-semibold text-muted-foreground">Elegí un día</span>
      <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
        {dias.map((d) => (
          <button
            key={d.fecha}
            onClick={() => setFechaSeleccionada(d.fecha)}
            disabled={d.horarios.length === 0}
            className={
              d.fecha === fechaSeleccionada
                ? "shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                : d.horarios.length === 0
                  ? "shrink-0 rounded-xl border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground/40"
                  : "shrink-0 rounded-xl border border-border/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            }
          >
            {formatDiaChip(d.fecha)}
          </button>
        ))}
      </div>

      <div className="mt-5 border-t border-dashed border-border pt-5">
        {diaActivo && (
          <span className="text-sm font-semibold">
            Horarios disponibles -- {formatDiaCompleto(diaActivo.fecha)}
          </span>
        )}
        {diaActivo && diaActivo.horarios.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Sin turnos disponibles este día.</p>
        )}
        {diaActivo && diaActivo.horarios.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {diaActivo.horarios.map((h) => (
              <button
                key={h.inicio}
                onClick={() => abrirFormulario(h.inicio)}
                className="rounded-lg border border-border/60 px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {formatHoraBA(new Date(h.inicio))}
              </button>
            ))}
          </div>
        )}
        {!diaActivo && (
          <p className="mt-3 text-sm text-muted-foreground">
            No hay horarios disponibles en los próximos días.
          </p>
        )}
      </div>

      <Dialog open={horarioElegido !== null} onOpenChange={(open) => !open && setHorarioElegido(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar turno</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label>Día</Label>
                <strong className="text-sm">
                  {fechaSeleccionada && formatDiaCompleto(fechaSeleccionada)}
                </strong>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Hora</Label>
                <strong className="text-sm">
                  {horarioElegido && `${formatHoraBA(new Date(horarioElegido))}hs`}
                </strong>
              </div>
            </div>
            <hr className="mt-2 mb-2" />
            <div className="flex flex-col gap-1.5">
              <Label>Nombre completo *</Label>
              <Input
                value={nombreYApellido}
                onChange={(e) => setNombreYApellido(e.target.value)}
                className={triedSubmit && !nombreYApellido.trim() ? "border-destructive" : undefined}
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
            <Button type="button" onClick={handleSubmitForm} disabled={saving}>
              {saving ? "Reservando..." : "Reservar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
