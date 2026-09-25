"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { nextDiaConHorario } from "@/lib/dia-nav";
import { buildMensajeRecordatorio, buildWhatsAppHref } from "@/lib/recordatorio-mensaje";
import {
  dateParamToDateBA,
  formatDateParamBA,
  formatHoraBA,
  isSameDayBA,
} from "@/lib/timezone";
import type { DiaSemana } from "@/lib/slots";

type RecordatorioTurno = {
  id: string;
  nombreYApellido: string;
  telefono: string;
  inicio: string;
  recordatorioEnviado: boolean;
};

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type Props = {
  tenantId: string;
  activeLugarId?: string | null;
  initialDate: string;
  initialTurnos: RecordatorioTurno[];
  initialDiasConHorario: DiaSemana[];
  initialSinConfigurar: boolean;
  mensajeTemplate: string;
};

export function RecordatoriosCalendar({
  tenantId,
  activeLugarId,
  initialDate,
  initialTurnos,
  initialDiasConHorario,
  initialSinConfigurar,
  mensajeTemplate,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    () => dateParamToDateBA(initialDate) ?? new Date()
  );
  const [turnos, setTurnos] = useState<RecordatorioTurno[]>(initialTurnos);
  const [diasConHorario, setDiasConHorario] = useState<DiaSemana[]>(initialDiasConHorario);
  const [sinConfigurar, setSinConfigurar] = useState(initialSinConfigurar);
  const [loading, setLoading] = useState(false);
  const [marcandoId, setMarcandoId] = useState<string | null>(null);

  // A diferencia de "Pendientes de notificar" (que saca el turno de su
  // lista al marcarlo), acá el turno sigue siendo parte de la agenda del
  // día -- se actualiza en el lugar, mostrando la insignia "Enviado" en vez
  // de desaparecer.
  async function handleMarcarNotificado(id: string) {
    setMarcandoId(id);
    try {
      const response = await fetch(`/api/turnos/${id}/recordatorio`, { method: "PATCH" });
      if (response.ok) {
        setTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, recordatorioEnviado: true } : t)));
      }
    } finally {
      setMarcandoId(null);
    }
  }

  async function loadTurnos(date: Date) {
    setLoading(true);
    try {
      const response = await fetch(`/api/recordatorios?date=${formatDateParamBA(date)}`);
      const data = await response.json();
      setTurnos(data.turnos ?? []);
      setDiasConHorario(data.diasConHorario ?? []);
      setSinConfigurar(Boolean(data.sinConfigurar));
    } finally {
      setLoading(false);
    }
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    loadTurnos(date);
  }

  // Cambiar de médico o de lugar activo (secretaria) no debe hacer perder
  // el día que se está mirando -- mismo criterio que en /turnos (ver
  // turnos-calendar.tsx).
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
    loadTurnos(selectedDateRef.current);
  }, [tenantId, activeLugarId]);

  const esHoy = isSameDayBA(selectedDate, new Date());
  const fechaLabel = capitalize(
    selectedDate.toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleSelectDate(nextDiaConHorario(selectedDate, -1, diasConHorario))}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-center text-sm font-semibold sm:text-lg">
          {fechaLabel}
          {esHoy && " (hoy)"}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleSelectDate(nextDiaConHorario(selectedDate, 1, diasConHorario))}
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}

          {!loading && sinConfigurar && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Todavía no hay horario cargado para esta práctica.
            </p>
          )}

          {!loading && !sinConfigurar && turnos.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay turnos agendados para ese día.
            </p>
          )}

          {!loading && turnos.length > 0 && (
            <ul className="flex flex-col gap-2">
              {turnos.map((turno) => {
                const inicio = new Date(turno.inicio);
                const hora = formatHoraBA(inicio);
                const mensaje = buildMensajeRecordatorio(mensajeTemplate, turno.nombreYApellido, inicio);
                const href = buildWhatsAppHref(turno.telefono, mensaje);

                return (
                  <li
                    key={turno.id}
                    className="flex flex-wrap items-start gap-3 rounded-md border border-border p-2"
                  >
                    <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold tabular-nums">
                      {hora}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{turno.nombreYApellido}</p>
                      <p className="text-xs text-muted-foreground">{turno.telefono}</p>
                    </div>
                    {turno.recordatorioEnviado ? (
                      <Badge className="h-auto gap-1 self-center bg-green-600 px-2.5 pt-1.5 pb-1 leading-none text-white">
                        <Check className="size-3" data-icon="inline-start" />
                        Enviado
                      </Badge>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          render={<a href={href} target="_blank" rel="noopener noreferrer" />}
                        >
                          <MessageCircle className="size-3.5" />
                          <span className="sm:hidden">Enviar</span>
                          <span className="hidden sm:inline">Enviar WhatsApp</span>
                        </Button>
                        <Button
                          size="sm"
                          disabled={marcandoId === turno.id}
                          onClick={() => handleMarcarNotificado(turno.id)}
                        >
                          <Check className="size-3.5" />
                          {marcandoId === turno.id ? "Marcando..." : "Marcar como enviado"}
                        </Button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
