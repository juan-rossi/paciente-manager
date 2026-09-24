"use client";

import { useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildMensajeCambioTurno, buildWhatsAppHref } from "@/lib/recordatorio-mensaje";
import { formatHoraBA } from "@/lib/timezone";

type TurnoPendienteAviso = {
  id: string;
  nombreYApellido: string;
  telefono: string;
  inicio: string;
  avisoPendienteMotivo: "CANCELADO" | "APLAZADO";
  avisoPendienteFechaAnterior: string | null;
};

type Props = {
  initialPendientes: TurnoPendienteAviso[];
  mensajeTemplateCancelado: string;
  mensajeTemplateAplazado: string;
};

// Sección fija (no colapsable, alternativa "F"): a diferencia del
// navegador de abajo, no depende de qué día se esté mirando -- lista TODOS
// los turnos que la resolución de conflictos de "Bloquear horarios" tocó y
// todavía nadie marcó como notificados. Se oculta sola en cuanto la lista
// queda vacía.
export function RecordatoriosPendientes({
  initialPendientes,
  mensajeTemplateCancelado,
  mensajeTemplateAplazado,
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
          // Para APLAZADO, `avisoPendienteFechaAnterior` es la fecha vieja
          // (lo que le tocan a {fecha}/{hora} en la plantilla) y `inicio`
          // (ya pisado) es la nueva ({nueva_fecha}). Para CANCELADO, el
          // turno nunca se movió: `inicio` sigue siendo la fecha original.
          const fechaOriginal = new Date(turno.avisoPendienteFechaAnterior ?? turno.inicio);
          const nuevaFecha = turno.avisoPendienteMotivo === "APLAZADO" ? new Date(turno.inicio) : null;
          const template =
            turno.avisoPendienteMotivo === "CANCELADO" ? mensajeTemplateCancelado : mensajeTemplateAplazado;
          const mensaje = buildMensajeCambioTurno(template, turno.nombreYApellido, fechaOriginal, nuevaFecha);
          const href = buildWhatsAppHref(turno.telefono, mensaje);
          const detalle =
            turno.avisoPendienteMotivo === "CANCELADO"
              ? `Turno cancelado · era el ${fechaOriginal.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} a las ${formatHoraBA(fechaOriginal)}`
              : `Turno aplazado · ahora es el ${nuevaFecha!.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} a las ${formatHoraBA(nuevaFecha!)}`;

          return (
            <li
              key={turno.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border border-l-4 border-l-amber-500 bg-amber-500/5 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{turno.nombreYApellido}</p>
                <p className="text-xs text-muted-foreground">{detalle}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<a href={href} target="_blank" rel="noopener noreferrer" />}
              >
                <MessageCircle className="size-3.5" />
                <span className="sm:hidden">Enviar</span>
                <span className="hidden sm:inline">Enviar por WhatsApp</span>
              </Button>
              <Button
                size="sm"
                disabled={marcandoId === turno.id}
                onClick={() => handleMarcarNotificado(turno.id)}
              >
                <Check className="size-3.5" />
                {marcandoId === turno.id ? "Marcando..." : "Marcar como notificado"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
