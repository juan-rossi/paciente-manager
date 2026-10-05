"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, MapPin, Phone } from "lucide-react";
import { ObraSocialSelect } from "@/components/obra-social-select";
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
import { filterTelefono } from "@/lib/utils";
import { DNI_ERROR_MESSAGE, DNI_REGEX } from "@/lib/dni";
import { TurnstileWidget } from "./turnstile-widget";

type HorarioDisponible = { inicio: string; lugarId: string | null };
type DisponibilidadDia = { fecha: string; horarios: HorarioDisponible[] };
type LugarOption = {
  id: string;
  tipo: "PARTICULAR" | "CONSULTORIO";
  nombre: string | null;
  ciudad: string | null;
  direccion?: string | null;
  telefono?: string | null;
};

function lugarLabel(lugar: LugarOption | undefined): string {
  return lugar?.nombre ?? "Consulta particular";
}

function filtrarPorLugar(dias: DisponibilidadDia[], lugarId: string): DisponibilidadDia[] {
  return dias.map((d) => ({ ...d, horarios: d.horarios.filter((h) => h.lugarId === lugarId) }));
}

function primerDiaConHorarios(dias: DisponibilidadDia[]): string | null {
  return (dias.find((d) => d.horarios.length > 0) ?? dias[0])?.fecha ?? null;
}

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

type Props = {
  slug: string;
  lugares: LugarOption[];
  lugarDestacado?: string;
  // Prepagas con las que trabaja el médico (opciones de Obra Social).
  prepagas?: string[];
};

export function PublicBookingCalendar({ slug, lugares, lugarDestacado, prepagas = [] }: Props) {
  // Con más de un lugar se elige con pestañas. Arranca en el lugar que ya
  // matcheó la búsqueda por ciudad (lugarDestacado) o, si no hay, en el
  // primero con turnos disponibles una vez cargada la disponibilidad.
  const [lugarSeleccionado, setLugarSeleccionado] = useState<string | null>(() =>
    lugarDestacado && lugares.some((l) => l.id === lugarDestacado) ? lugarDestacado : (lugares[0]?.id ?? null)
  );
  const lugarElegido = lugares.find((l) => l.id === lugarSeleccionado);

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
  const [turnstileToken, setTurnstileToken] = useState("");

  async function cargarDisponibilidad(lugarInicial: string | null) {
    try {
      const response = await fetch(`/api/directorio/${slug}/disponibilidad`);
      if (!response.ok) {
        setLoadError("No se pudo cargar la disponibilidad.");
        return;
      }
      const data = await response.json();
      const dias: DisponibilidadDia[] = data.dias ?? [];
      setDias(dias);
      let lugarActivo = lugarInicial;
      const destacado = !!lugarDestacado && lugares.some((l) => l.id === lugarDestacado);
      if (!destacado && lugarActivo !== null && lugares.length > 1) {
        const conTurnos = lugares.find((l) => dias.some((d) => d.horarios.some((h) => h.lugarId === l.id)));
        if (conTurnos) lugarActivo = conTurnos.id;
      }
      if (lugarActivo !== null) {
        setLugarSeleccionado(lugarActivo);
        setFechaSeleccionada(primerDiaConHorarios(filtrarPorLugar(dias, lugarActivo)));
      }
    } catch {
      setLoadError("No se pudo conectar con el servidor.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDisponibilidad(lugarSeleccionado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function elegirLugar(lugarId: string) {
    setLugarSeleccionado(lugarId);
    if (dias) setFechaSeleccionada(primerDiaConHorarios(filtrarPorLugar(dias, lugarId)));
  }

  function abrirFormulario(horario: string) {
    setHorarioElegido(horario);
    setNombreYApellido("");
    setDni("");
    setTelefono("");
    setObraSocial("");
    setTriedSubmit(false);
    setError(null);
    setTurnstileToken("");
  }

  async function handleSubmitForm() {
    setTriedSubmit(true);
    if (!nombreYApellido.trim() || !dni.trim() || !telefono.trim() || !horarioElegido) {
      setError("Completá los campos obligatorios.");
      return;
    }
    if (!DNI_REGEX.test(dni)) {
      setError(DNI_ERROR_MESSAGE);
      return;
    }
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Completá la verificación de seguridad.");
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
          turnstileToken,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "No se pudo reservar el turno.");
        if (response.status === 409) {
          await cargarDisponibilidad(lugarSeleccionado);
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
        {lugarElegido && (
          <p className="text-sm text-muted-foreground">
            Lugar: <strong>{lugarLabel(lugarElegido)}</strong>
            {lugarElegido.direccion && ` · ${lugarElegido.direccion}`}
          </p>
        )}
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

  // Con un lugar elegido (incluso si es el único) solo se ven sus horarios:
  // el link de un lugar puntual nunca debe ofrecer turnos de otro.
  const diasVista = lugarSeleccionado ? filtrarPorLugar(dias, lugarSeleccionado) : dias;
  // Un día sin ningún horario cargado (nunca se configuró en "Mi práctica")
  // ni siquiera se muestra como chip deshabilitado -- no aporta nada
  // clickearlo si ya se sabe que no hay nada ahí.
  const diasConTurnos = diasVista.filter((d) => d.horarios.length > 0);
  const diaActivo = diasConTurnos.find((d) => d.fecha === fechaSeleccionada) ?? null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-accent text-white">
          <CalendarDays className="size-4.5" />
        </span>
        <span className="font-heading block text-[15px] font-bold">Reservar turno online</span>
      </div>

      {lugares.length > 1 && (
        <div role="tablist" aria-label="Lugar de atención" className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-muted/40 p-1">
          {lugares.map((lugar) => {
            const activo = lugar.id === lugarSeleccionado;
            const tieneDisponibilidad = dias.some((d) => d.horarios.some((h) => h.lugarId === lugar.id));
            return (
              <button
                key={lugar.id}
                type="button"
                role="tab"
                aria-selected={activo}
                onClick={() => elegirLugar(lugar.id)}
                className={
                  activo
                    ? "min-w-0 flex-1 rounded-lg bg-card px-3 py-2 text-left shadow-sm"
                    : "min-w-0 flex-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-card/60"
                }
              >
                <span className={`block truncate text-[13px] font-bold ${activo ? "text-primary" : "text-foreground"}`}>
                  {lugarLabel(lugar)}
                </span>
                <span className="block truncate text-[11.5px] text-muted-foreground">
                  {lugar.tipo === "PARTICULAR" ? "Particular" : "Consultorio"}
                  {lugar.ciudad && ` · ${lugar.ciudad}`}
                  {!tieneDisponibilidad && " · sin turnos"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {lugarElegido && (
        <div className="mt-4 flex flex-col gap-1.5 text-[13px]">
          {lugares.length === 1 && <span className="font-bold">{lugarLabel(lugarElegido)}</span>}
          {lugarElegido.direccion && (
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>
                {lugarElegido.direccion}
                {" · "}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lugarElegido.direccion)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  Ver en mapa
                </a>
              </span>
            </span>
          )}
          {lugarElegido.telefono && (
            <span className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0 text-primary" />
              {lugarElegido.telefono}
            </span>
          )}
        </div>
      )}

      {(
        <>
          <span className="mt-4 block text-sm font-semibold text-muted-foreground">Elegí un día</span>
          {diasConTurnos.length > 0 ? (
            <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
              {diasConTurnos.map((d) => (
                <button
                  key={d.fecha}
                  onClick={() => setFechaSeleccionada(d.fecha)}
                  className={
                    d.fecha === fechaSeleccionada
                      ? "shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                      : "shrink-0 rounded-xl border border-border/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  }
                >
                  {formatDiaChip(d.fecha)}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No hay días disponibles en las próximas semanas.
            </p>
          )}

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

        </>
      )}

      <Dialog open={horarioElegido !== null} onOpenChange={(open) => !open && setHorarioElegido(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar turno</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {lugarElegido && (
              <div className="flex flex-col gap-1">
                <Label>Lugar</Label>
                <strong className="text-sm">{lugarLabel(lugarElegido)}</strong>
                {lugarElegido.direccion && (
                  <span className="text-xs text-muted-foreground">{lugarElegido.direccion}</span>
                )}
              </div>
            )}
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
                  maxLength={8}
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                  className={triedSubmit && !DNI_REGEX.test(dni) ? "border-destructive" : undefined}
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
              <ObraSocialSelect value={obraSocial} onChange={setObraSocial} prepagas={prepagas} />
            </div>
            <TurnstileWidget onToken={setTurnstileToken} />
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
