import { formatHoraBA, startOfDayBA } from "@/lib/timezone";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// `{fecha}` no es una fecha formateada fija -- depende de cuánto falta para
// el turno respecto al momento en que se manda el recordatorio (no del día
// que se esté mirando en la pantalla de Recordatorios, que puede ser
// distinto). El texto ya incluye su propio conector ("el 23/09/2026"), así
// que la plantilla no debe repetirlo.
export function formatFechaRecordatorio(turnoInicio: Date, ahora: Date = new Date()): string {
  const diaTurno = startOfDayBA(turnoInicio).getTime();
  const diaHoy = startOfDayBA(ahora).getTime();
  const diffDias = Math.round((diaTurno - diaHoy) / MS_POR_DIA);

  if (diffDias === 0) return "hoy";
  if (diffDias === 1) return "mañana";

  const fecha = turnoInicio.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  return `el ${fecha}`;
}

export function buildMensajeRecordatorio(
  template: string,
  nombre: string,
  turnoInicio: Date,
  ahora: Date = new Date()
): string {
  return template
    .replaceAll("{nombre}", nombre)
    .replaceAll("{fecha}", formatFechaRecordatorio(turnoInicio, ahora))
    .replaceAll("{hora}", formatHoraBA(turnoInicio));
}

// Mensaje de cancelación/aplazamiento (ver "Pendientes de notificar" en
// Recordatorios) -- a diferencia de `buildMensajeRecordatorio`, `{fecha}`/
// `{hora}` son las del turno ANTES del cambio (lo que el paciente tenía
// agendado), no las de un turno futuro. `nuevaFecha` solo se pasa para un
// aplazamiento; si la plantilla no tiene `{nueva_fecha}` (ej. la de
// cancelación) el `.replaceAll` no encuentra nada y no hace nada.
export function buildMensajeCambioTurno(
  template: string,
  nombre: string,
  fechaOriginal: Date,
  nuevaFecha: Date | null = null,
  ahora: Date = new Date()
): string {
  let mensaje = template
    .replaceAll("{nombre}", nombre)
    .replaceAll("{fecha}", formatFechaRecordatorio(fechaOriginal, ahora))
    .replaceAll("{hora}", formatHoraBA(fechaOriginal));
  if (nuevaFecha) {
    mensaje = mensaje
      .replaceAll("{nueva_fecha}", formatFechaRecordatorio(nuevaFecha, ahora))
      .replaceAll("{nueva_hora}", formatHoraBA(nuevaFecha));
  }
  return mensaje;
}

export function buildWhatsAppHref(telefono: string, mensaje: string): string {
  let digits = telefono.replace(/\D/g, "");
  // Un teléfono cargado sin código de país (10 dígitos: código de área +
  // número, sin el "54" de Argentina) no arma un link de wa.me válido --
  // se lo agregamos antes de armar el link.
  if (digits.length === 10) {
    digits = `54${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensaje)}`;
}
