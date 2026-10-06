"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, MapPin, Phone, X } from "lucide-react";
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
import { formatDateParamBA, formatHoraBA, TIME_ZONE } from "@/lib/timezone";
import { CANCELACION_ANTELACION_MINUTOS, puedeCancelarOnline } from "@/lib/turno-cancelacion-reglas";
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
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dia = get("weekday").replace(".", "");
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${get("day")}/${get("month")}`;
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

// Turno vigente del visitante (el de la cookie). `lugarNombre`/`direccion`
// son para mostrar; la regla de cancelación se revalida en el server.
export type TurnoVigente = {
  inicio: string;
  lugarNombre: string | null;
  direccion: string | null;
};

type Props = {
  slug: string;
  // Turno que el visitante ya tenía reservado al cargar la página.
  turnoActivo?: TurnoVigente | null;
  lugares: LugarOption[];
  lugarDestacado?: string;
  // Prepagas con las que trabaja el médico (opciones de Obra Social).
  prepagas?: string[];
  // En mobile abre el wizard de turnos apenas carga la página.
  abrirWizardEnMobile?: boolean;
};

export function PublicBookingCalendar({ slug, turnoActivo = null, lugares, lugarDestacado, prepagas = [], abrirWizardEnMobile = false }: Props) {
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
  const [turno, setTurno] = useState<TurnoVigente | null>(turnoActivo);
  const [exitoAbierto, setExitoAbierto] = useState(false);
  const [confirmarCancelAbierto, setConfirmarCancelAbierto] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelado, setCancelado] = useState(false);

  const [nombreYApellido, setNombreYApellido] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [obraSocial, setObraSocial] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  // Mobile: el calendario se reemplaza por un botón fijo abajo que abre un
  // modal a pantalla completa con la reserva en pasos (día, horario, datos).
  const [movilAbierto, setMovilAbierto] = useState(false);
  const [paso, setPaso] = useState<1 | 2>(1);

  useEffect(() => {
    if (!movilAbierto) return;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrarMovil();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [movilAbierto]);

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
    // Con un turno vigente no se ofrece calendario: se carga recién si lo cancela.
    if (turnoActivo) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDisponibilidad(lugarSeleccionado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Link de un lugar puntual en mobile: el wizard arranca abierto, con ese
  // lugar ya elegido. Se evalúa una sola vez al montar.
  useEffect(() => {
    if (abrirWizardEnMobile && window.matchMedia("(max-width: 767px)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMovilAbierto(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function elegirLugar(lugarId: string) {
    setLugarSeleccionado(lugarId);
    setHorarioElegido(null);
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

  function abrirMovil() {
    setPaso(1);
    setHorarioElegido(null);
    setNombreYApellido("");
    setDni("");
    setTelefono("");
    setObraSocial("");
    setTriedSubmit(false);
    setError(null);
    setTurnstileToken("");
    setMovilAbierto(true);
  }

  // Se limpia el horario: con el modal cerrado un horario elegido abriría el
  // diálogo de escritorio.
  function cerrarMovil() {
    setMovilAbierto(false);
    setHorarioElegido(null);
  }

  function elegirDia(fecha: string) {
    setFechaSeleccionada(fecha);
    setHorarioElegido(null);
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
      setTurno({
        inicio: horarioElegido,
        lugarNombre: lugarElegido ? lugarLabel(lugarElegido) : null,
        direccion: lugarElegido?.direccion ?? null,
      });
      setCancelado(false);
      setHorarioElegido(null);
      setMovilAbierto(false);
      setExitoAbierto(true);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelarTurno() {
    setCancelando(true);
    setCancelError(null);
    try {
      const response = await fetch(`/api/directorio/${slug}/turno`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok && response.status !== 404) {
        setCancelError(data?.error ?? "No se pudo cancelar el turno.");
        return;
      }
      // 404: el turno ya no existía (vencido o cancelado en otra pestaña);
      // en ambos casos se vuelve al calendario.
      setConfirmarCancelAbierto(false);
      setExitoAbierto(false);
      setTurno(null);
      setCancelado(response.ok);
      setDias(null);
      await cargarDisponibilidad(lugarSeleccionado);
    } catch {
      setCancelError("No se pudo conectar con el servidor.");
    } finally {
      setCancelando(false);
    }
  }

  // Reservado: el éxito se muestra en un modal y, al cerrarlo, queda la
  // tarjeta inline. Sin calendario ni botón fijo de "Solicitar turno".
  if (turno) {
    const inicio = new Date(turno.inicio);
    const puedeCancelar = puedeCancelarOnline(inicio);
    const detalle = (
      <>
        <p className="text-sm text-muted-foreground">
          Tu turno está confirmado para el <strong>{formatDiaCompleto(formatDateParamBA(inicio))}</strong> a
          las <strong>{formatHoraBA(inicio)}hs</strong>.
        </p>
        {turno.lugarNombre && (
          <p className="text-sm text-muted-foreground">
            Lugar: <strong>{turno.lugarNombre}</strong>
            {turno.direccion && ` · ${turno.direccion}`}
          </p>
        )}
      </>
    );
    return (
      <>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-accent/30 bg-brand-accent/5 p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-accent text-white">
            <CalendarDays className="size-6" />
          </span>
          <h2 className="font-heading text-lg font-bold">Tenés un turno reservado</h2>
          {detalle}
          {puedeCancelar ? (
            <Button
              type="button"
              variant="outline"
              className="mt-2 border-destructive/40 text-destructive hover:bg-destructive/5"
              onClick={() => {
                setCancelError(null);
                setConfirmarCancelAbierto(true);
              }}
            >
              Cancelar turno
            </Button>
          ) : (
            <p className="mt-2 max-w-sm text-xs text-muted-foreground">
              Faltan menos de {CANCELACION_ANTELACION_MINUTOS / 60} hora para tu turno, por eso ya no se puede
              cancelar online. Si no podés asistir, contactá al médico directamente.
            </p>
          )}
        </div>
        <Dialog open={exitoAbierto} onOpenChange={setExitoAbierto}>
          <DialogContent className="items-center text-center">
            <div className="flex flex-col items-center gap-3 pt-2">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand-accent text-white">
                <CalendarDays className="size-6" />
              </span>
              <DialogTitle className="text-lg font-bold">¡Turno reservado!</DialogTitle>
              {detalle}
              <p className="text-xs text-muted-foreground">
                Si tenés un inconveniente, podés cancelarlo desde esta misma página hasta{" "}
                {CANCELACION_ANTELACION_MINUTOS / 60} hora antes.
              </p>
            </div>
            <Button type="button" onClick={() => setExitoAbierto(false)}>
              Entendido
            </Button>
          </DialogContent>
        </Dialog>
        <Dialog open={confirmarCancelAbierto} onOpenChange={(open) => !cancelando && setConfirmarCancelAbierto(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Cancelar tu turno?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Se libera el horario del {formatDiaCompleto(formatDateParamBA(inicio))} a las{" "}
              {formatHoraBA(inicio)}hs. Después vas a poder reservar otro.
            </p>
            {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={cancelando} onClick={() => setConfirmarCancelAbierto(false)}>
                Mantener turno
              </Button>
              <Button type="button" variant="destructive" disabled={cancelando} onClick={handleCancelarTurno}>
                {cancelando ? "Cancelando..." : "Sí, cancelar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (loadError) {
    return <p className="hidden text-sm text-muted-foreground md:block">{loadError}</p>;
  }

  if (!dias) {
    return (
      <div className="hidden items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card p-8 text-sm text-muted-foreground md:flex">
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

  const lugarTabs = lugares.length > 1 && (
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
  );

  const lugarInfo = lugarElegido && (
    <div className="mt-4 flex flex-col gap-1.5 text-[13px]">
      {lugares.length === 1 && <span className="font-bold">{lugarLabel(lugarElegido)}</span>}
      {lugarElegido.direccion && (
        <span className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>
            {lugarElegido.direccion}
            <span className="hidden sm:inline">{" · "}</span>
            <br className="sm:hidden" />
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
  );

  const selectorDia = (apilado: boolean) => (
    <>
      <span className="mt-4 block text-sm font-semibold text-muted-foreground">Elegí un día</span>
      {diasConTurnos.length > 0 ? (
        <div
          className={
            apilado
              ? "mt-2 grid grid-cols-3 gap-2 [&>button]:px-2"
              : "mt-2 flex flex-wrap items-center gap-2"
          }
        >
          {diasConTurnos.map((d) => (
            <button
              key={d.fecha}
              onClick={() => elegirDia(d.fecha)}
              className={
                d.fecha === fechaSeleccionada
                  ? "shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                  : "shrink-0 rounded-xl border border-border/60 bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-muted dark:bg-white"
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
    </>
  );

  const horariosDelDia = (onElegir: (inicio: string) => void) => (
    <>
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
              onClick={() => onElegir(h.inicio)}
              className={
                h.inicio === horarioElegido
                  ? "rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
                  : "rounded-lg border border-border/60 bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted dark:bg-white"
              }
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
    </>
  );

  const campoNombre = (
    <div className="flex flex-col gap-1.5">
      <Label>Nombre completo *</Label>
      <Input
        value={nombreYApellido}
        onChange={(e) => setNombreYApellido(e.target.value)}
        className={`bg-white dark:bg-white ${triedSubmit && !nombreYApellido.trim() ? "border-destructive" : ""}`}
      />
    </div>
  );
  const campoDni = (
    <div className="flex flex-col gap-1.5">
      <Label>DNI *</Label>
      <Input
        inputMode="numeric"
        maxLength={8}
        value={dni}
        onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
        className={`bg-white dark:bg-white ${triedSubmit && !DNI_REGEX.test(dni) ? "border-destructive" : ""}`}
      />
    </div>
  );
  const campoTelefono = (
    <div className="flex flex-col gap-1.5">
      <Label>Teléfono *</Label>
      <Input
        inputMode="numeric"
        value={telefono}
        onChange={(e) => setTelefono(filterTelefono(e.target.value))}
        className={`bg-white dark:bg-white ${triedSubmit && !telefono.trim() ? "border-destructive" : ""}`}
      />
    </div>
  );
  const campoObraSocial = (
    <div className="flex flex-col gap-1.5">
      <Label>Obra Social</Label>
      <ObraSocialSelect value={obraSocial} onChange={setObraSocial} prepagas={prepagas} triggerClassName="bg-white dark:bg-white" />
    </div>
  );

  const tituloPaso = paso === 1 ? "Elegí día y horario" : "Tus datos";

  return (
    <>
      {cancelado && (
        <p className="mb-3 rounded-xl border border-brand-accent/30 bg-brand-accent/5 px-4 py-3 text-sm">
          Cancelamos tu turno. Si querés, podés reservar otro.
        </p>
      )}
      <div className="hidden rounded-2xl border border-border/60 bg-card p-6 md:block">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-accent text-white">
            <CalendarDays className="size-4.5" />
          </span>
          <span className="font-heading block text-[15px] font-bold">Reservar turno online</span>
        </div>

        {lugarTabs}
        {lugarInfo}
        {selectorDia(false)}

        <div className="mt-5 border-t border-dashed border-border pt-5">{horariosDelDia(abrirFormulario)}</div>

        <Dialog
          open={horarioElegido !== null && !movilAbierto}
          onOpenChange={(open) => !open && setHorarioElegido(null)}
        >
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
              {campoNombre}
              <div className="grid gap-3 sm:grid-cols-2">
                {campoDni}
                {campoTelefono}
              </div>
              {campoObraSocial}
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

      {/* Mobile: botón fijo abajo + reserva en pantalla completa. */}
      <div className="h-20 md:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <Button type="button" size="lg" className="h-12 w-full text-[15px] font-bold" onClick={abrirMovil}>
          <CalendarDays className="size-4.5" />
          Solicitar turno
        </Button>
      </div>

      {movilAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Solicitar turno"
          className="fixed inset-0 z-50 flex h-dvh flex-col bg-background md:hidden"
        >
          <div className="flex items-center gap-2 border-b border-border/60 bg-card px-4 py-3">
            <span className="font-heading text-[15px] font-bold">Solicitar turno</span>
            <button
              type="button"
              onClick={cerrarMovil}
              aria-label="Cerrar"
              className="ml-auto flex size-8 items-center justify-center rounded-full bg-muted text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 px-4 pt-3">
            <div className="flex gap-1">
              {[1, 2].map((n) => (
                <span key={n} className={`h-1 flex-1 rounded-full ${n <= paso ? "bg-primary" : "bg-border"}`} />
              ))}
            </div>
            <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Paso {paso} de 2 · {tituloPaso}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-1 pb-6">
            {paso === 1 && (
              <>
                {lugarTabs}
                {lugarInfo}
                {selectorDia(true)}
                <div className="mt-5 border-t border-dashed border-border pt-5">
                  {horariosDelDia((inicio) => {
                    setHorarioElegido(inicio);
                    setError(null);
                  })}
                </div>
              </>
            )}

            {paso === 2 && (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card p-3 text-sm">
                  {lugarElegido && <strong>{lugarLabel(lugarElegido)}</strong>}
                  {lugarElegido?.direccion && (
                    <span className="text-xs text-muted-foreground">{lugarElegido.direccion}</span>
                  )}
                  <span>
                    {fechaSeleccionada && formatDiaCompleto(fechaSeleccionada)}
                    {horarioElegido && ` · ${formatHoraBA(new Date(horarioElegido))}hs`}
                  </span>
                </div>
                {campoNombre}
                {campoDni}
                {campoTelefono}
                {campoObraSocial}
                <TurnstileWidget onToken={setTurnstileToken} />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t border-border/60 bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {paso > 1 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12"
                onClick={() => setPaso(1)}
              >
                Atrás
              </Button>
            )}
            {paso === 1 ? (
              <Button
                type="button"
                size="lg"
                className="h-12 flex-1"
                disabled={!horarioElegido}
                onClick={() => setPaso(2)}
              >
                Siguiente
              </Button>
            ) : (
              <Button type="button" size="lg" className="h-12 flex-1" onClick={handleSubmitForm} disabled={saving}>
                {saving ? "Reservando..." : "Confirmar turno"}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
