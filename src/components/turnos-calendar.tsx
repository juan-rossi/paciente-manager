"use client";

import { useEffect, useRef, useState } from "react";
import { es } from "date-fns/locale";
import {
  formatCaption as defaultFormatCaption,
  formatWeekdayName as defaultFormatWeekdayName,
} from "react-day-picker";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { diaSemanaFromDate, type DiaSemana } from "@/lib/slots";
import { nextDiaConHorario } from "@/lib/dia-nav";
import { agruparPorLugar, bloquesDelDia } from "@/lib/bloques-dia";
import {
  dateParamToDateBA,
  formatDateParamBA,
  isSameDayBA,
  startOfDayBA,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CompartirAgendaButton } from "@/components/compartir-agenda-button";
import { Card, CardContent } from "@/components/ui/card";
import type { BloqueoDelDia, LugarInfo, Slot } from "@/components/turnos-calendar/types";
import {
  LugarIcon,
  capitalize,
  formatHora,
  lugarNombre,
  tipoLabel,
} from "@/components/turnos-calendar/utils";
import { LugarDayGrid } from "@/components/turnos-calendar/day-grid";
import { useTurnoForm } from "@/components/turnos-calendar/use-turno-form";
import { useSobreturno } from "@/components/turnos-calendar/use-sobreturno";
import { useBloqueo } from "@/components/turnos-calendar/use-bloqueo";
import { TurnoDialogs } from "@/components/turnos-calendar/turno-dialogs";
import { SobreturnoDialog } from "@/components/turnos-calendar/sobreturno-dialog";
import { BloqueoDialogs } from "@/components/turnos-calendar/bloqueo-dialogs";

type Props = {
  role: UserRole;
  // Identifican de quién son los turnos que se están mostrando -- una
  // secretaria puede cambiar de médico y/o de lugar activo sin salir de
  // esta pantalla (ver doctor-switcher.tsx/lugar-switcher.tsx en el
  // header). El efecto más abajo los usa para refetchear sin resetear el
  // día que se está mirando.
  tenantId: string;
  activeLugarId?: string | null;
  // Permiso específico de la relación médico-secretaria (ver
  // `DoctorSecretaria.puedeBloquearHorarios`) -- un DOCTOR siempre puede.
  puedeBloquearHorarios: boolean;
  initialDate: string;
  initialSlots: Slot[];
  initialSobreturnos: Slot[];
  initialSinConfigurar: boolean;
  initialDiasConHorario: DiaSemana[];
  // Fechas puntuales fuera de `diasConHorario` (turnos movidos vía "Mover a
  // un día libre") que igual tienen que poder navegarse -- ver
  // get-day-slots.ts.
  initialDiasEspeciales: string[];
  initialSobreturnosHabilitados: boolean;
  initialLugares: LugarInfo[];
  initialBloqueosDelDia: BloqueoDelDia[];
  // Nombres de las prepagas con las que trabaja el médico (opciones del
  // desplegable de Obra Social).
  prepagas: string[];
  // Link público de reserva para compartir; null si la agenda pública no
  // está habilitada.
  compartir: { url: string; nombreMedico: string; lugarNombre: string | null } | null;
};

export function TurnosCalendar({
  role,
  tenantId,
  activeLugarId,
  puedeBloquearHorarios,
  initialDate,
  initialSlots,
  initialSobreturnos,
  initialSinConfigurar,
  initialDiasConHorario,
  initialDiasEspeciales,
  initialSobreturnosHabilitados,
  initialLugares,
  initialBloqueosDelDia,
  prepagas,
  compartir,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    () => dateParamToDateBA(initialDate) ?? new Date()
  );
  // Mes que muestra el mini-calendario -- separado de `selectedDate` para
  // que navegar con "Anterior"/"Siguiente" (que puede cruzar de mes) lo
  // siga, sin perder la posición si el usuario lo hojea a mano sin elegir
  // un día (ver `onMonthChange` más abajo).
  const [calendarMonth, setCalendarMonth] = useState<Date>(selectedDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [sobreturnos, setSobreturnos] = useState<Slot[]>(initialSobreturnos);
  const [sinConfigurar, setSinConfigurar] = useState(initialSinConfigurar);
  const [diasConHorario, setDiasConHorario] = useState<DiaSemana[]>(initialDiasConHorario);
  const [diasEspeciales, setDiasEspeciales] = useState<string[]>(initialDiasEspeciales);
  const [sobreturnosHabilitados, setSobreturnosHabilitados] = useState(
    initialSobreturnosHabilitados
  );
  const [lugares, setLugares] = useState<LugarInfo[]>(initialLugares);
  const [bloqueosDelDia, setBloqueosDelDia] = useState<BloqueoDelDia[]>(initialBloqueosDelDia);
  const [loading, setLoading] = useState(false);
  // En mobile arranca colapsado para no ocupar toda la pantalla con el
  // calendario -- en desktop (lg+) siempre se muestra, sin importar este
  // estado (ver el className del contenedor más abajo).
  const [calendarOpen, setCalendarOpen] = useState(false);

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
      setDiasEspeciales(data.diasEspeciales ?? []);
      setSobreturnosHabilitados(Boolean(data.sobreturnosHabilitados));
      setLugares(data.lugares ?? []);
      setBloqueosDelDia(data.bloqueosDelDia ?? []);
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
    setCalendarMonth(date);
    await loadSlots(date);
  }

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

  const turnoForm = useTurnoForm({ selectedDate, loadSlots });
  const { openBooking, openEdit } = turnoForm;
  const sobreturno = useSobreturno({ bloques, selectedDate, loadSlots });
  const { openSobreturnoDialog } = sobreturno;
  const bloqueo = useBloqueo({ role, bloques, selectedDate, loadSlots });
  const { openBloqueoDialog, requestUnblock } = bloqueo;

  const today = new Date();
  const isToday = isSameDayBA(selectedDate, today);
  const isPastDay = selectedDate < todayStart;

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
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  disabled={(date) =>
                    !diasConHorario.includes(diaSemanaFromDate(date)) &&
                    !diasEspeciales.includes(formatDateParamBA(date))
                  }
                  modifiers={{ past: (date) => date < todayStart }}
                  modifiersClassNames={{ past: "text-muted-foreground opacity-50" }}
                />
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-5 gap-2 lg:flex lg:flex-col lg:gap-3">
            {sobreturnosHabilitados && (
              <Button
                type="button"
                className={cn(
                  sobreturnosHabilitados && puedeBloquearHorarios ? "col-span-3" : "col-span-5",
                  "lg:w-full"
                )}
                disabled={isPastDay || bloques.length === 0}
                onClick={openSobreturnoDialog}
              >
                + Sobreturno
              </Button>
            )}
            {puedeBloquearHorarios && (
              <Button
                type="button"
                variant="outline"
                className={cn(
                  sobreturnosHabilitados && puedeBloquearHorarios ? "col-span-2" : "col-span-5",
                  "lg:w-full bg-card shadow-sm"
                )}
                disabled={isPastDay || bloques.length === 0}
                onClick={openBloqueoDialog}
              >
                <Lock className="size-4" />
                Bloquear<span className="hidden lg:inline"> horarios</span>
              </Button>
            )}
            {compartir && (
              <CompartirAgendaButton
                {...compartir}
                size="default"
                className="col-span-5 bg-card shadow-sm lg:w-full"
              />
            )}
          </div>
        </div>

        <div className="flex flex-1 min-h-0 flex-col gap-3">
          <div className="flex shrink-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shadow-sm"
              onClick={() =>
                handleSelectDate(nextDiaConHorario(selectedDate, -1, diasConHorario, diasEspeciales))
              }
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
              className="shadow-sm"
              onClick={() =>
                handleSelectDate(nextDiaConHorario(selectedDate, 1, diasConHorario, diasEspeciales))
              }
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

                {!loading && !sinConfigurar && slots.length === 0 && sobreturnos.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay horario configurado para este día.
                  </p>
                )}

                {!loading && (slots.length > 0 || sobreturnos.length > 0) && (
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
                              onUnblock={(bloqueoId, lugarId, rango, rangoInicio, rangoFin) =>
                                requestUnblock(
                                  bloqueoId,
                                  `${lugarNombre(lugaresPorId.get(lugarId))} · ${rango}`,
                                  lugarId,
                                  rangoInicio,
                                  rangoFin
                                )
                              }
                              puedeBloquearHorarios={puedeBloquearHorarios}
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

      <TurnoDialogs state={turnoForm} selectedDate={selectedDate} prepagas={prepagas} />

      <SobreturnoDialog
        state={sobreturno}
        selectedDate={selectedDate}
        prepagas={prepagas}
        bloques={bloques}
        lugaresPorId={lugaresPorId}
      />

      <BloqueoDialogs
        state={bloqueo}
        role={role}
        selectedDate={selectedDate}
        bloques={bloques}
        lugaresPorId={lugaresPorId}
        bloqueosDelDia={bloqueosDelDia}
      />
    </div>
  );
}
