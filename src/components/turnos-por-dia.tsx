"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { diaSemanaFromDate, type DiaSemana } from "@/lib/slots";
import { dateParamToDateBA, formatDateParamBA, formatHoraBA, isSameDayBA } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import type { TurnoDelDia } from "@/lib/turnos-del-dia";

const formatHora = formatHoraBA;

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function newPatientHref(turno: TurnoDelDia) {
  const params = new URLSearchParams({ nombreYApellido: turno.nombreYApellido });
  if (turno.dni) params.set("nroDocumento", turno.dni);
  if (turno.telefono) params.set("telefono", turno.telefono);
  if (turno.obraSocial) params.set("obraSocial", turno.obraSocial);
  return `/patients/new?${params.toString()}`;
}

type Props = {
  initialDate: string;
  initialTurnos: TurnoDelDia[];
  diasConHorario: DiaSemana[];
  // Cambia a la pestaña "Buscar paciente" -- la maneja el padre porque las
  // pestañas viven en `DashboardTabs`, un nivel arriba de este componente.
  onBuscarPaciente?: () => void;
};

export function TurnosPorDia({
  initialDate,
  initialTurnos,
  diasConHorario,
  onBuscarPaciente,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    () => dateParamToDateBA(initialDate) ?? new Date()
  );
  const [turnos, setTurnos] = useState<TurnoDelDia[]>(initialTurnos);
  const [loading, setLoading] = useState(false);

  const today = new Date();

  function diaValido(date: Date) {
    return diasConHorario.includes(diaSemanaFromDate(date));
  }

  // Busca el día válido anterior más cercano (con horario configurado),
  // saltando los días sin bloques. Tope defensivo de ~10 años para nunca
  // colgarse si `diasConHorario` estuviera vacío por algún motivo raro.
  function findPrevValidDay(from: Date): Date | null {
    if (diasConHorario.length === 0) return null;
    let candidato = addDays(from, -1);
    for (let i = 0; i < 3650; i++) {
      if (diaValido(candidato)) return candidato;
      candidato = addDays(candidato, -1);
    }
    return null;
  }

  // Igual que arriba pero hacia adelante, sin pasarse de "hoy" -- nunca se
  // puede navegar al futuro.
  function findNextValidDay(from: Date): Date | null {
    if (diasConHorario.length === 0) return null;
    const topeParam = formatDateParamBA(today);
    let candidato = addDays(from, 1);
    while (formatDateParamBA(candidato) <= topeParam) {
      if (diaValido(candidato)) return candidato;
      candidato = addDays(candidato, 1);
    }
    return null;
  }

  const prevValidDay = findPrevValidDay(selectedDate);
  const nextValidDay = findNextValidDay(selectedDate);

  async function loadTurnos(date: Date) {
    setLoading(true);
    try {
      const response = await fetch(`/api/turnos-del-dia?date=${formatDateParamBA(date)}`);
      const data = await response.json();
      setTurnos(data.turnos ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function goTo(date: Date | null) {
    if (!date) return;
    setSelectedDate(date);
    await loadTurnos(date);
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!prevValidDay}
              onClick={() => goTo(prevValidDay)}
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
              disabled={!nextValidDay}
              onClick={() => goTo(nextValidDay)}
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {loading && <p className="py-4 text-center text-sm text-muted-foreground">Cargando...</p>}

          {!loading && turnos.length === 0 && !isSameDayBA(selectedDate, today) && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay turnos agendados para este día.
            </p>
          )}

          {!loading && turnos.length === 0 && isSameDayBA(selectedDate, today) && (
            <div className="flex flex-col gap-4 py-1">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <CalendarClock className="size-6 text-primary" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-base font-semibold">Hoy no tenés turnos</p>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Podés agregar un turno o revisar la agenda de los próximos días.
                  </p>
                </div>
                <Button size="sm" className="mt-1" nativeButton={false} render={<Link href="/turnos" />}>
                  Ver próxima disponibilidad
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <span className="px-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Accesos rápidos
                </span>
                <Link
                  href="/patients/new"
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-accent/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10">
                    <UserPlus className="size-4 text-primary" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold">Nuevo paciente</span>
                    <span className="text-xs text-muted-foreground">Crear una historia clínica</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
                <button
                  type="button"
                  onClick={onBuscarPaciente}
                  disabled={!onBuscarPaciente}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-accent/40 disabled:pointer-events-none disabled:opacity-50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10">
                    <Search className="size-4 text-primary" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold">Buscar paciente</span>
                    <span className="text-xs text-muted-foreground">
                      Consultar antecedentes y evoluciones
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {!loading && turnos.length > 0 && (
            <ul className="flex flex-col gap-2">
              {turnos.map((turno) =>
                turno.patientId ? (
                  <li key={turno.id}>
                    <Link
                      href={`/patients/${turno.patientId}?turnoId=${turno.id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-md border p-2 transition-colors",
                        turno.esSobreturno
                          ? "border-dashed border-amber-500/70 bg-amber-500/10 hover:bg-amber-500/20"
                          : "border-border hover:bg-accent/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-14 shrink-0 items-center justify-center rounded-md border text-sm font-semibold tabular-nums",
                          turno.esSobreturno
                            ? "border-amber-500/70 bg-amber-500/15 text-amber-800 dark:text-amber-400"
                            : "border-border bg-muted"
                        )}
                      >
                        {formatHora(new Date(turno.inicio))}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{turno.nombreYApellido}</p>
                        {turno.esSobreturno && (
                          <p className="truncate text-xs font-medium text-amber-700 dark:text-amber-400">
                            Sobreturno
                          </p>
                        )}
                        {turno.dni && (
                          <p className="truncate text-xs text-muted-foreground">DNI {turno.dni}</p>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 justify-center whitespace-nowrap",
                          turno.matchType === "dni"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        )}
                      >
                        <span className="hidden sm:inline">Match por </span>
                        {turno.matchType === "dni" ? "DNI" : "nombre"}
                      </Badge>
                      <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                    </Link>
                  </li>
                ) : (
                  <li
                    key={turno.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md border border-dashed p-2",
                      turno.esSobreturno ? "border-amber-500/70 bg-amber-500/10" : "border-border"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-14 shrink-0 items-center justify-center rounded-md border text-sm font-semibold tabular-nums",
                        turno.esSobreturno
                          ? "border-amber-500/70 bg-amber-500/15 text-amber-800 dark:text-amber-400"
                          : "border-transparent bg-muted"
                      )}
                    >
                      {formatHora(new Date(turno.inicio))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{turno.nombreYApellido}</p>
                      {turno.esSobreturno && (
                        <p className="truncate text-xs font-medium text-amber-700 dark:text-amber-400">
                          Sobreturno
                        </p>
                      )}
                      {turno.dni && (
                        <p className="truncate text-xs text-muted-foreground">DNI {turno.dni}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      className="shrink-0"
                      title="Crear paciente"
                      render={<Link href={newPatientHref(turno)} />}
                    >
                      <UserPlus className="size-3.5" />
                      <span className="hidden sm:inline">Crear paciente</span>
                    </Button>
                  </li>
                )
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
