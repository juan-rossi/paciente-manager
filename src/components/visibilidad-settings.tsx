"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Copy,
  Globe2,
  Layers,
  Link2,
  Loader2,
  Save,
  TriangleAlert,
} from "lucide-react";
import { SettingsSection } from "@/components/settings-section";
import { CompartirAgendaButton } from "@/components/compartir-agenda-button";
import { irAConfiguracionTab } from "@/lib/configuracion-tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { RESERVA_PUBLICA_SEMANAS_OPCIONES } from "@/lib/perfil-schema";
import {
  normalizarRedSocial,
  RED_SOCIAL_LABELS,
  RED_SOCIAL_PLACEHOLDERS,
  type RedesSociales,
  type RedSocial,
} from "@/lib/redes-sociales";
import { RED_SOCIAL_ICONS } from "@/components/redes-sociales-icons";

// Orden en el form: primero las redes más usadas, la comunidad de WhatsApp
// en el medio (en el perfil público va destacada, ver PerfilShell).
const REDES_FORM: RedSocial[] = ["instagram", "facebook", "whatsappComunidad", "tiktok", "youtube"];

function redesATexto(redes: RedesSociales): Record<RedSocial, string> {
  return Object.fromEntries(REDES_FORM.map((red) => [red, redes[red] ?? ""])) as Record<RedSocial, string>;
}

type LugarResumen = {
  id: string;
  tipo: "PARTICULAR" | "CONSULTORIO";
  nombre: string | null;
  direccion: string;
  telefono: string;
  ciudad: string | null;
  perfilVisible: boolean;
  reservaPublicaHabilitada: boolean;
  publicSlug: string | null;
  // Si tiene al menos un bloque de horario cargado en "Mi práctica".
  tieneHorarios: boolean;
};

type Props = {
  // "Dr. Juan Pérez" -- para el texto al compartir el link de la agenda.
  nombreMedico: string;
  initialPerfilPublico: boolean;
  // Prácticas activas del médico -- de acá salen consultorio, dirección y
  // teléfono del perfil público. Se leen siempre de las props (no de estado
  // local) para reflejar los cambios hechos en "Mi práctica" tras un refresh.
  lugares: LugarResumen[];
  initialBiografia: string | null;
  initialRedes: RedesSociales;
  initialReservaPublicaHabilitada: boolean;
  initialReservaPublicaSemanas: number;
  initialPublicSlug: string | null;
};

export function VisibilidadSettings({
  nombreMedico,
  initialPerfilPublico,
  lugares,
  initialBiografia,
  initialRedes,
  initialReservaPublicaHabilitada,
  initialReservaPublicaSemanas,
  initialPublicSlug,
}: Props) {
  const router = useRouter();

  const [perfilPublico, setPerfilPublico] = useState(initialPerfilPublico);
  const [biografia, setBiografia] = useState(initialBiografia ?? "");
  const [redes, setRedes] = useState(() => redesATexto(initialRedes));
  // El error de una red se muestra recién al salir del campo (mientras se
  // escribe un link, a medias, siempre es inválido).
  const [redesTocadas, setRedesTocadas] = useState<RedSocial[]>([]);
  const erroresRedes = Object.fromEntries(
    REDES_FORM.map((red) => {
      const resultado = normalizarRedSocial(red, redes[red]);
      return [red, resultado.ok ? null : resultado.error];
    }),
  ) as Record<RedSocial, string | null>;
  const hayRedesInvalidas = REDES_FORM.some((red) => erroresRedes[red]);
  const sinPracticas = lugares.length === 0;
  // Con un solo lugar no hay nada que elegir: ni el listado de lugares visibles
  // ni un link por lugar.
  const variosLugares = lugares.length > 1;
  // Lugares que se muestran en el perfil público -- se guardan junto con el
  // resto de la información pública (botón "Guardar cambios"), a diferencia
  // de la agenda.
  const [lugaresVisibles, setLugaresVisibles] = useState<string[]>(() =>
    lugares.filter((l) => l.perfilVisible).map((l) => l.id),
  );
  const sinLugaresVisibles = !sinPracticas && lugaresVisibles.length === 0;

  function togglePerfilPublico(checked: boolean) {
    setPerfilPublico(checked);
    // Al activarlo, todos los lugares arrancan visibles.
    if (checked) setLugaresVisibles(lugares.map((l) => l.id));
  }

  function toggleLugarVisible(id: string, checked: boolean) {
    const next = checked
      ? [...lugaresVisibles, id]
      : lugaresVisibles.filter((x) => x !== id);
    setLugaresVisibles(next);
    // Sin ningún lugar visible el perfil no tiene qué mostrar: se apaga el principal.
    if (next.length === 0) setPerfilPublico(false);
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo la información pública depende de "Guardar cambios" (la agenda se
  // guarda al instante). El botón se habilita únicamente si algo difiere de
  // lo guardado.
  const visibilidadSnapshot = JSON.stringify({
    perfilPublico,
    biografia,
    lugaresVisibles: [...lugaresVisibles].sort(),
    redes,
  });
  const [visibilidadGuardada, setVisibilidadGuardada] =
    useState(visibilidadSnapshot);
  const hayCambios = visibilidadSnapshot !== visibilidadGuardada;

  const [reservaPublicaHabilitada, setReservaPublicaHabilitada] = useState(
    initialReservaPublicaHabilitada,
  );
  const [reservaPublicaSemanas, setReservaPublicaSemanas] = useState(
    initialReservaPublicaSemanas,
  );
  const [publicSlug, setPublicSlug] = useState(initialPublicSlug);
  const [agendaPublicaSaving, setAgendaPublicaSaving] = useState(false);
  const [agendaPublicaError, setAgendaPublicaError] = useState<string | null>(
    null,
  );
  // Qué link se acaba de copiar (`"general"` o el id de un lugar), para
  // mostrar "¡Copiado!" solo en ese botón.
  const [copiado, setCopiado] = useState<string | null>(null);
  // Turnos online por lugar -- se guardan al instante, como el switch general.
  const [reservaPorLugar, setReservaPorLugar] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(lugares.map((l) => [l.id, l.reservaPublicaHabilitada])),
  );
  const [lugarAgendaSaving, setLugarAgendaSaving] = useState<string | null>(
    null,
  );
  // Sin ningún lugar con horarios no hay turnos que ofrecer: los links no sirven.
  const sinLugaresConHorarios = !lugares.some((l) => l.tieneHorarios);

  async function handleGuardar() {
    setError(null);
    if (hayRedesInvalidas) {
      setRedesTocadas(REDES_FORM);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/perfil/visibilidad", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfilPublico, biografia, lugaresVisibles, redes }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la información pública.");
        return;
      }
      // El server devuelve las redes normalizadas ("@usuario" → URL completa):
      // se muestran así y el snapshot guardado pasa a ser ese.
      const redesGuardadas = redesATexto(data.redes);
      setRedes(redesGuardadas);
      setVisibilidadGuardada(
        JSON.stringify({ ...JSON.parse(visibilidadSnapshot), redes: redesGuardadas }),
      );
      setPublicSlug(data.publicSlug);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleReservaPublica(checked: boolean) {
    const previous = reservaPublicaHabilitada;
    setReservaPublicaHabilitada(checked);
    setAgendaPublicaSaving(true);
    setAgendaPublicaError(null);
    try {
      const response = await fetch("/api/perfil/agenda-publica", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaPublicaHabilitada: checked }),
      });
      const data = await response.json();
      if (!response.ok) {
        setReservaPublicaHabilitada(previous);
        setAgendaPublicaError(data.error ?? "No se pudo guardar el cambio.");
        return;
      }
      setReservaPublicaHabilitada(data.reservaPublicaHabilitada);
      setPublicSlug(data.publicSlug);
      if (data.reservaPublicaHabilitada) {
        setReservaPorLugar(
          Object.fromEntries(lugares.map((l) => [l.id, true])),
        );
        router.refresh();
      }
    } catch {
      setReservaPublicaHabilitada(previous);
      setAgendaPublicaError("No se pudo conectar con el servidor.");
    } finally {
      setAgendaPublicaSaving(false);
    }
  }

  async function handleCambiarSemanas(semanas: number) {
    const previous = reservaPublicaSemanas;
    if (semanas === previous) return;
    setReservaPublicaSemanas(semanas);
    setAgendaPublicaSaving(true);
    setAgendaPublicaError(null);
    try {
      const response = await fetch("/api/perfil/agenda-publica", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaPublicaSemanas: semanas }),
      });
      const data = await response.json();
      if (!response.ok) {
        setReservaPublicaSemanas(previous);
        setAgendaPublicaError(data.error ?? "No se pudo guardar el cambio.");
        return;
      }
      setReservaPublicaSemanas(data.reservaPublicaSemanas);
    } catch {
      setReservaPublicaSemanas(previous);
      setAgendaPublicaError("No se pudo conectar con el servidor.");
    } finally {
      setAgendaPublicaSaving(false);
    }
  }

  // Último día que ve el paciente (hoy + N semanas - 1), en hora de Buenos
  // Aires para que server y cliente rendericen lo mismo.
  const [hoy] = useState(() => Date.now());
  const fechaLimiteReserva = new Date(
    hoy + (reservaPublicaSemanas * 7 - 1) * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  // El server no conoce `window.location.origin` -- arranca mostrando el
  // dominio de producción (igual en server y cliente, sin mismatch de
  // hidratación) y recién en el cliente, ya montado, lo corrige al origin
  // real (útil para probar el link en local). Mismo criterio que el filtro
  // recordado en PatientSearch.
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicLink = publicSlug
    ? `${origin ?? "semio360.com"}/directorio/${publicSlug}`
    : null;

  async function handleToggleReservaLugar(lugarId: string, checked: boolean) {
    const previous = reservaPorLugar[lugarId];
    setReservaPorLugar((prev) => ({ ...prev, [lugarId]: checked }));
    setLugarAgendaSaving(lugarId);
    setAgendaPublicaError(null);
    try {
      const response = await fetch(
        `/api/lugares-trabajo/${lugarId}/agenda-publica`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservaPublicaHabilitada: checked }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setReservaPorLugar((prev) => ({ ...prev, [lugarId]: previous }));
        setAgendaPublicaError(data.error ?? "No se pudo guardar el cambio.");
        return;
      }
      // Sin ningún lugar con turnos online, la agenda pública no tiene sentido.
      const quedaAlguno = lugares.some((l) =>
        l.id === lugarId ? checked : (reservaPorLugar[l.id] ?? false),
      );
      if (!checked && !quedaAlguno && reservaPublicaHabilitada) {
        await handleToggleReservaPublica(false);
      }
    } catch {
      setReservaPorLugar((prev) => ({ ...prev, [lugarId]: previous }));
      setAgendaPublicaError("No se pudo conectar con el servidor.");
    } finally {
      setLugarAgendaSaving(null);
    }
  }

  async function handleCopiar(clave: string, link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(clave);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Portapapeles no disponible (permiso denegado, contexto no seguro,
      // etc.) -- no hay mucho más para hacer que dejar el link visible para
      // copiarlo a mano.
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <SettingsSection title="Información pública" icon={Globe2}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">Perfil público</span>
            <p className="max-w-md text-xs text-muted-foreground">
              Aparecerá en el directorio público de Semio360 con los datos de
              tus prácticas.
            </p>
          </div>
          <Switch
            checked={perfilPublico}
            onCheckedChange={togglePerfilPublico}
          />
        </div>

        {perfilPublico && (
          <div className="flex flex-col gap-3 border-t border-dashed border-border pt-3">
            {sinPracticas ? (
              <div
                role="alert"
                className="flex flex-wrap items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <div className="flex min-w-48 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold">
                    Tu perfil todavía no es público
                  </span>
                  <span className="text-xs">
                    No aparecerá en el directorio hasta que configures tus
                    prácticas.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => irAConfiguracionTab("practica")}
                >
                  Configurar prácticas
                </Button>
              </div>
            ) : (
              variosLugares && (
                <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Lugares visibles en tu perfil
                    </span>
                    <button
                      type="button"
                      onClick={() => irAConfiguracionTab("practica")}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Editar prácticas
                    </button>
                  </div>
                  <ul className="flex flex-col divide-y divide-border/60">
                    {lugares.map((lugar) => {
                      const visible = lugaresVisibles.includes(lugar.id);
                      return (
                        <li
                          key={lugar.id}
                          className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                        >
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span
                              className={cn(
                                "text-sm font-medium",
                                !visible && "text-muted-foreground",
                              )}
                            >
                              {lugar.nombre ?? "Consulta particular"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {lugar.direccion} · {lugar.telefono}
                            </span>
                          </div>
                          <Switch
                            checked={visible}
                            onCheckedChange={(checked) =>
                              toggleLugarVisible(lugar.id, checked)
                            }
                            aria-label={`Mostrar ${lugar.nombre ?? "Consulta particular"} en el perfil`}
                          />
                        </li>
                      );
                    })}
                  </ul>
                  {sinLugaresVisibles && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Ningún lugar está visible: tu perfil no aparecerá en el
                      directorio hasta que muestres al menos uno.
                    </p>
                  )}
                </div>
              )
            )}

            <div className="flex flex-col gap-1.5 mt-2">
              <Label htmlFor="perfil-bio">Biografía</Label>
              <Textarea
                id="perfil-bio"
                rows={4}
                value={biografia}
                onChange={(e) => setBiografia(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-dashed border-border pt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-sm font-semibold">Redes y comunidad</span>
                <span className="text-xs text-muted-foreground">
                  Opcional · completá solo las que uses
                </span>
              </div>
              {REDES_FORM.map((red) => {
                const Icon = RED_SOCIAL_ICONS[red];
                const errorRed = redesTocadas.includes(red) ? erroresRedes[red] : null;
                const id = `perfil-red-${red}`;
                return (
                  <div key={red} className="flex flex-col gap-1">
                    <div className="flex">
                      <label
                        htmlFor={id}
                        className="flex w-32 shrink-0 items-center gap-1.5 rounded-l-lg border border-r-0 border-input bg-muted/60 px-2.5 text-xs font-semibold text-muted-foreground"
                      >
                        <Icon className="size-3.5 shrink-0" />
                        {RED_SOCIAL_LABELS[red]}
                      </label>
                      <Input
                        id={id}
                        value={redes[red]}
                        placeholder={RED_SOCIAL_PLACEHOLDERS[red]}
                        aria-invalid={!!errorRed}
                        aria-describedby={errorRed ? `${id}-error` : undefined}
                        onChange={(e) => setRedes({ ...redes, [red]: e.target.value })}
                        onBlur={() =>
                          setRedesTocadas((prev) => (prev.includes(red) ? prev : [...prev, red]))
                        }
                        className="h-9 rounded-l-none"
                      />
                    </div>
                    {errorRed && (
                      <p id={`${id}-error`} className="text-xs text-destructive">
                        {errorRed}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end border-t border-dashed border-border pt-3">
          <Button
            type="button"
            onClick={handleGuardar}
            disabled={saving || !hayCambios}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Agenda pública" icon={CalendarDays}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">
              Permitir que cualquiera reserve un turno
            </span>
            <p className="max-w-md text-xs text-muted-foreground">
              Los visitantes podrán agendar un turno desde tu link público, sin
              necesidad de contactarte.
            </p>
          </div>
          <Switch
            checked={reservaPublicaHabilitada}
            onCheckedChange={handleToggleReservaPublica}
            disabled={agendaPublicaSaving}
          />
        </div>
        {agendaPublicaError && (
          <p className="text-xs text-destructive">{agendaPublicaError}</p>
        )}

        {reservaPublicaHabilitada && sinLugaresConHorarios && (
          <div
            role="alert"
            className="flex flex-wrap items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div className="flex min-w-48 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold">
                Tu agenda todavía no está disponible
              </span>
              <span className="text-xs">
                Nadie podrá reservar turnos hasta que configures al menos un
                lugar de atención con horarios.
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => irAConfiguracionTab("practica")}
            >
              Configurar lugares
            </Button>
          </div>
        )}

        {reservaPublicaHabilitada &&
          !sinLugaresConHorarios &&
          variosLugares && (
            <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Lugares con turnos online
              </span>
              <ul className="flex flex-col divide-y divide-border/60">
                {lugares.map((lugar) => {
                  const habilitado = reservaPorLugar[lugar.id] ?? false;
                  const nombreLugar = lugar.nombre ?? "Consulta particular";
                  const linkLugar =
                    publicSlug && lugar.publicSlug
                      ? `${origin ?? "semio360.com"}/directorio/${publicSlug}/${lugar.publicSlug}`
                      : null;
                  return (
                    <li
                      key={lugar.id}
                      className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              !habilitado && "text-muted-foreground",
                            )}
                          >
                            {nombreLugar}
                          </span>
                          {!habilitado && (
                            <span className="text-xs text-muted-foreground">
                              Sin turnos online. No tiene link.
                            </span>
                          )}
                        </div>
                        <Switch
                          checked={habilitado}
                          onCheckedChange={(checked) =>
                            handleToggleReservaLugar(lugar.id, checked)
                          }
                          disabled={lugarAgendaSaving === lugar.id}
                          aria-label={`Turnos online en ${nombreLugar}`}
                        />
                      </div>
                      {habilitado && linkLugar && (
                        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 py-1.5 pr-1.5 pl-3">
                          <Link2 className="size-4 shrink-0 text-primary" />
                          <span className="flex-1 truncate font-mono text-xs text-primary">
                            {linkLugar}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleCopiar(lugar.id, linkLugar)}
                          >
                            {copiado === lugar.id ? (
                              <Check className="size-4" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                            {copiado === lugar.id ? "¡Copiado!" : "Copiar"}
                          </Button>
                          <CompartirAgendaButton
                            url={linkLugar}
                            nombreMedico={nombreMedico}
                            lugarNombre={lugar.nombre}
                            variant="outline"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

        {reservaPublicaHabilitada && !sinLugaresConHorarios && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">
                Cuánto tiempo hacia adelante se puede reservar
              </span>
              <p className="text-xs text-muted-foreground">
                Los pacientes solo verán turnos libres dentro de este período.
              </p>
            </div>
            <div
              role="group"
              aria-label="Semanas visibles en la agenda pública"
              className="inline-flex w-fit flex-wrap gap-0.5 rounded-lg border border-border bg-muted p-[3px]"
            >
              {RESERVA_PUBLICA_SEMANAS_OPCIONES.map((semanas) => {
                const activo = semanas === reservaPublicaSemanas;
                return (
                  <button
                    key={semanas}
                    type="button"
                    aria-pressed={activo}
                    disabled={agendaPublicaSaving}
                    onClick={() => handleCambiarSemanas(semanas)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default",
                      activo
                        ? "border-border bg-card font-semibold text-foreground shadow"
                        : "border-transparent font-medium text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {semanas === 1 ? "1 semana" : `${semanas} semanas`}
                  </button>
                );
              })}
            </div>
            <p
              className="text-xs text-muted-foreground"
              suppressHydrationWarning
            >
              Hoy podrían reservar hasta el {fechaLimiteReserva}.
            </p>
          </div>
        )}

        {reservaPublicaHabilitada && !sinLugaresConHorarios && publicLink && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Layers className="size-4 shrink-0 text-primary" />
              <span className="text-sm font-semibold">Link general</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 py-1.5 pr-1.5 pl-3">
              <Link2 className="size-4 shrink-0 text-primary" />
              <span className="flex-1 truncate font-mono text-xs text-primary">
                {publicLink}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => handleCopiar("general", publicLink)}
              >
                {copiado === "general" ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copiado === "general" ? "¡Copiado!" : "Copiar"}
              </Button>
              <CompartirAgendaButton
                url={publicLink}
                nombreMedico={nombreMedico}
                variant="outline"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {variosLugares
                ? "Ofrece todos los lugares con turnos online y el paciente elige uno. Para evitar confusiones, mandale el link del lugar."
                : "Compartilo con tus pacientes para que reserven un turno."}
            </p>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
