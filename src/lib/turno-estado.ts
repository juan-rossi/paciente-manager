// Reglas puras (sin dependencias de servidor) para poder usarlas también en
// el cliente.

// Estado que se muestra en la grilla de Turnos. No es una columna: sale de
// `estado` (activo/cancelado), `recordatorioEnviado` y `confirmadoAt`, así
// todo lo que hoy filtra por `estado: "CONFIRMADO"` (= activo) sigue igual.
export type EstadoVisualTurno = "NUEVO" | "RECORDATORIO_ENVIADO" | "CONFIRMADO" | "CANCELADO";

export function estadoVisualTurno(turno: {
  estado: string;
  recordatorioEnviado: boolean;
  confirmadoAt: string | Date | null;
}): EstadoVisualTurno {
  if (turno.estado === "CANCELADO") return "CANCELADO";
  if (turno.confirmadoAt) return "CONFIRMADO";
  if (turno.recordatorioEnviado) return "RECORDATORIO_ENVIADO";
  return "NUEVO";
}

export const ESTADO_VISUAL_LABELS: Record<EstadoVisualTurno, string> = {
  NUEVO: "Nuevo",
  RECORDATORIO_ENVIADO: "Recordatorio enviado",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
};

// Al mover un turno de horario, la confirmación (y el recordatorio) eran
// para el horario anterior: vuelve a "Nuevo".
export const RESET_CONFIRMACION = { recordatorioEnviado: false, confirmadoAt: null } as const;
