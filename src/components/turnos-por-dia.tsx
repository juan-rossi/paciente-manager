"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
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
};

export function TurnosPorDia({ initialDate, initialTurnos, diasConHorario }: Props) {
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
              disabled={!nextValidDay}
              onClick={() => goTo(nextValidDay)}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {loading && <p className="py-4 text-center text-sm text-muted-foreground">Cargando...</p>}

          {!loading && turnos.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {isSameDayBA(selectedDate, today)
                ? "No hay turnos agendados para hoy."
                : "No hay turnos agendados para este día."}
            </p>
          )}

          {!loading && turnos.length > 0 && (
            <ul className="flex flex-col gap-2">
              {turnos.map((turno) =>
                turno.patientId ? (
                  <li key={turno.id}>
                    <Link
                      href={`/patients/${turno.patientId}?turnoId=${turno.id}`}
                      className="flex items-center gap-3 rounded-md border border-border p-2 transition-colors hover:bg-accent/40"
                    >
                      <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold tabular-nums">
                        {formatHora(new Date(turno.inicio))}
                      </span>
                      <div className="w-48 min-w-0 shrink-0">
                        <p className="truncate text-sm font-medium">{turno.nombreYApellido}</p>
                        {turno.dni && (
                          <p className="truncate text-xs text-muted-foreground">DNI {turno.dni}</p>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "w-28 shrink-0 justify-center",
                          turno.matchType === "dni"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        )}
                      >
                        Match por {turno.matchType === "dni" ? "DNI" : "nombre"}
                      </Badge>
                      <div className="flex-1" />
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ) : (
                  <li
                    key={turno.id}
                    className="flex items-center gap-3 rounded-md border border-dashed border-border p-2"
                  >
                    <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold tabular-nums">
                      {formatHora(new Date(turno.inicio))}
                    </span>
                    <div className="w-48 min-w-0 shrink-0">
                      <p className="truncate text-sm font-medium">{turno.nombreYApellido}</p>
                      {turno.dni && (
                        <p className="truncate text-xs text-muted-foreground">DNI {turno.dni}</p>
                      )}
                    </div>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={newPatientHref(turno)} />}
                    >
                      <UserPlus className="size-3.5" />
                      Crear paciente
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
