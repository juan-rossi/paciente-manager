"use client";

import { useState } from "react";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildMensajeCambioTurno,
  buildMensajePasoTeleconsulta,
  buildMensajeVueltaPresencial,
  buildWhatsAppHref,
  type AvisoPasoTeleconsulta,
} from "@/lib/recordatorio-mensaje";
import { formatHoraBA } from "@/lib/timezone";
import type { TurnoPendienteAviso } from "@/lib/turnos-pendientes-aviso";

type Props = {
  initialPendientes: TurnoPendienteAviso[];
  mensajeTemplateCancelado: string;
  mensajeTemplateAplazado: string;
  avisoPasoTeleconsulta: AvisoPasoTeleconsulta;
};

function fechaLarga(date: Date) {
  return date.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

// Mensaje de WhatsApp y textos de la fila según el motivo.
function contenidoAviso(
  turno: TurnoPendienteAviso,
  plantillas: { cancelado: string; aplazado: string; pasoTeleconsulta: AvisoPasoTeleconsulta }
): { mensaje: string; detalle: string; detalleCorto: string } {
  const inicio = new Date(turno.inicio);
  switch (turno.avisoPendienteMotivo) {
    case "PASADO_A_TELECONSULTA":
      return {
        mensaje: buildMensajePasoTeleconsulta(
          plantillas.pasoTeleconsulta,
          turno.nombreYApellido,
          inicio,
          turno.linksTeleconsulta
        ),
        detalle: `Pasó a teleconsulta · ${fechaLarga(inicio)} a las ${formatHoraBA(inicio)}`,
        detalleCorto: `Teleconsulta · ${fechaCorta(inicio)} ${formatHoraBA(inicio)}`,
      };
    case "PASADO_A_PRESENCIAL":
      return {
        mensaje: buildMensajeVueltaPresencial(turno.nombreYApellido, inicio, turno.dondeAtiende),
        detalle: `Volvió a presencial · ${fechaLarga(inicio)} a las ${formatHoraBA(inicio)}`,
        detalleCorto: `Presencial · ${fechaCorta(inicio)} ${formatHoraBA(inicio)}`,
      };
    case "CANCELADO": {
      // El turno nunca se movió: `inicio` sigue siendo la fecha original.
      const fechaOriginal = new Date(turno.avisoPendienteFechaAnterior ?? turno.inicio);
      return {
        mensaje: buildMensajeCambioTurno(plantillas.cancelado, turno.nombreYApellido, fechaOriginal, null),
        detalle: `Turno cancelado · era el ${fechaLarga(fechaOriginal)} a las ${formatHoraBA(fechaOriginal)}`,
        // Versión corta para mobile -- el detalle completo wrappeaba feo en
        // pantallas angostas.
        detalleCorto: `Cancelado · ${fechaCorta(fechaOriginal)} ${formatHoraBA(fechaOriginal)}`,
      };
    }
    case "APLAZADO": {
      // `avisoPendienteFechaAnterior` es la fecha vieja (lo que le toca a
      // {fecha}/{hora} en la plantilla) e `inicio` (ya pisado) la nueva
      // ({nueva_fecha}).
      const fechaOriginal = new Date(turno.avisoPendienteFechaAnterior ?? turno.inicio);
      return {
        mensaje: buildMensajeCambioTurno(plantillas.aplazado, turno.nombreYApellido, fechaOriginal, inicio),
        detalle: `Turno aplazado · ahora es el ${fechaLarga(inicio)} a las ${formatHoraBA(inicio)}`,
        detalleCorto: `Aplazado → ${fechaCorta(inicio)} ${formatHoraBA(inicio)}`,
      };
    }
  }
}

function fechaCorta(date: Date) {
  return date.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "numeric",
  });
}

// Sección fija (no colapsable, alternativa "F"): a diferencia del
// navegador de abajo, no depende de qué día se esté mirando -- lista TODOS
// los turnos que la resolución de conflictos de "Bloquear horarios" tocó, o
// a los que se les cambió la modalidad, y todavía nadie marcó como
// notificados. Se oculta sola en cuanto la lista
// queda vacía.
export function RecordatoriosPendientes({
  initialPendientes,
  mensajeTemplateCancelado,
  mensajeTemplateAplazado,
  avisoPasoTeleconsulta,
}: Props) {
  const [pendientes, setPendientes] = useState<TurnoPendienteAviso[]>(initialPendientes);
  const [marcandoId, setMarcandoId] = useState<string | null>(null);

  async function handleMarcarNotificado(id: string) {
    setMarcandoId(id);
    try {
      const response = await fetch(`/api/turnos/${id}/aviso`, { method: "PATCH" });
      if (response.ok) {
        setPendientes((prev) => prev.filter((t) => t.id !== id));
      }
    } finally {
      setMarcandoId(null);
    }
  }

  if (pendientes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Pendientes de notificar</span>
        <Badge className="bg-amber-500 text-white">{pendientes.length}</Badge>
      </div>
      <ul className="flex flex-col gap-2">
        {pendientes.map((turno) => {
          const { mensaje, detalle, detalleCorto } = contenidoAviso(turno, {
            cancelado: mensajeTemplateCancelado,
            aplazado: mensajeTemplateAplazado,
            pasoTeleconsulta: avisoPasoTeleconsulta,
          });
          const href = buildWhatsAppHref(turno.telefono, mensaje);
          const marcando = marcandoId === turno.id;

          return (
            <li
              key={turno.id}
              className="flex items-center gap-2 rounded-md border border-border border-l-4 border-l-amber-500 bg-amber-500/5 p-2.5 sm:gap-3 sm:p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{turno.nombreYApellido}</p>
                <p className="truncate text-xs text-muted-foreground sm:hidden">{detalleCorto}</p>
                <p className="hidden text-xs text-muted-foreground sm:block">{detalle}</p>
              </div>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Enviar por WhatsApp"
                className="sm:h-7 sm:w-auto sm:gap-1 sm:px-2.5"
                nativeButton={false}
                render={<a href={href} target="_blank" rel="noopener noreferrer" />}
              >
                <MessageCircle className="size-3.5" />
                <span className="hidden sm:inline">Enviar por WhatsApp</span>
              </Button>
              <Button
                size="icon-sm"
                aria-label="Marcar como notificado"
                className="sm:h-7 sm:w-auto sm:gap-1 sm:px-2.5"
                disabled={marcando}
                onClick={() => handleMarcarNotificado(turno.id)}
              >
                {marcando ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                <span className="hidden sm:inline">{marcando ? "Marcando..." : "Marcar como notificado"}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
