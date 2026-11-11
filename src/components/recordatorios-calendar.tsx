"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Mail, MessageCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
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
import type { RecordatorioTurno } from "@/lib/get-recordatorios-del-dia";

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
  // Config del médico (Mensajería): "Enviar WhatsApp" también marca el
  // turno como enviado, y el botón aparte "Marcar como enviado" se oculta.
  autoMarcarEnviado: boolean;
};

export function RecordatoriosCalendar({
  tenantId,
  activeLugarId,
  initialDate,
  initialTurnos,
  initialDiasConHorario,
  initialSinConfigurar,
  mensajeTemplate,
  autoMarcarEnviado,
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

  function setEnviado(id: string, value: boolean) {
    setTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, recordatorioEnviado: value } : t)));
  }

  // Auto-marcado: el link de WhatsApp sigue abriéndose normalmente (no se
  // frena la navegación); el estado se actualiza optimista y se revierte si
  // el PATCH falla.
  async function handleEnviarYMarcar(id: string) {
    setEnviado(id, true);
    const response = await fetch(`/api/turnos/${id}/recordatorio`, { method: "PATCH" }).catch(() => null);
    if (!response?.ok) setEnviado(id, false);
  }

  async function handleDesmarcar(id: string) {
    setEnviado(id, false);
    const response = await fetch(`/api/turnos/${id}/recordatorio`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) setEnviado(id, true);
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
  // Comparación contra el médico/lugar anterior, no "saltear el primer
  // render" -- ver turnos-calendar.tsx.
  const tenantLugarAnterior = useRef({ tenantId, activeLugarId });
  useEffect(() => {
    const anterior = tenantLugarAnterior.current;
    if (anterior.tenantId === tenantId && anterior.activeLugarId === activeLugarId) return;
    tenantLugarAnterior.current = { tenantId, activeLugarId };
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
                const mensaje = buildMensajeRecordatorio(
                  mensajeTemplate,
                  turno.nombreYApellido,
                  inicio,
                  new Date(),
                  turno.links
                );
                const href = buildWhatsAppHref(turno.telefono, mensaje);

                const marcando = marcandoId === turno.id;

                return (
                  <li
                    key={turno.id}
                    className="flex items-center gap-2 rounded-md border border-border p-2 sm:gap-3"
                  >
                    <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold tabular-nums">
                      {hora}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{turno.nombreYApellido}</p>
                      <p className="truncate text-xs text-muted-foreground">{turno.telefono}</p>
                    </div>
                    {turno.confirmado ? (
                      <Badge className="h-auto gap-1 self-center bg-emerald-600 px-2.5 pt-1.5 pb-1 leading-none text-white">
                        <Check className="size-3" data-icon="inline-start" />
                        Confirmado
                      </Badge>
                    ) : turno.recordatorioEnviado ? (
                      <Badge
                        className="h-auto cursor-pointer gap-1 self-center bg-primary px-2.5 pt-1.5 pb-1 leading-none text-primary-foreground hover:bg-primary/85"
                        title="Tocá para desmarcar"
                        render={
                          <button
                            type="button"
                            aria-label={`Desmarcar recordatorio enviado a ${turno.nombreYApellido}`}
                            onClick={() => handleDesmarcar(turno.id)}
                          />
                        }
                      >
                        <Mail className="size-3" data-icon="inline-start" />
                        Enviado
                        <X className="size-3 opacity-70" data-icon="inline-end" />
                      </Badge>
                    ) : (
                      <>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={autoMarcarEnviado ? "Enviar por WhatsApp y marcar como enviado" : "Enviar por WhatsApp"}
                          className="sm:h-7 sm:w-auto sm:gap-1 sm:px-2.5"
                          nativeButton={false}
                          render={
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={autoMarcarEnviado ? () => handleEnviarYMarcar(turno.id) : undefined}
                            />
                          }
                        >
                          <MessageCircle className="size-3.5" />
                          <span className="hidden sm:inline">
                            {autoMarcarEnviado ? "Enviar y marcar" : "Enviar WhatsApp"}
                          </span>
                        </Button>
                        {!autoMarcarEnviado && (
                          <Button
                            size="icon-sm"
                            aria-label="Marcar como enviado"
                            className="sm:h-7 sm:w-auto sm:gap-1 sm:px-2.5"
                            disabled={marcando}
                            onClick={() => handleMarcarNotificado(turno.id)}
                          >
                            {marcando ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                            <span className="hidden sm:inline">{marcando ? "Marcando..." : "Marcar como enviado"}</span>
                          </Button>
                        )}
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
