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

export type PlantillasRecordatorio = {
  // Turnos presenciales.
  general: string;
  // Turnos de un lugar VIRTUAL (teleconsulta) -- `User.mensajeTemplateVirtual`.
  virtual: string;
};

// Una teleconsulta se reconoce porque trae el link de `{videollamada}` (ver
// getRecordatoriosDelDia): usa la plantilla de teleconsulta.
export function plantillaRecordatorio(
  plantillas: PlantillasRecordatorio,
  links?: { videollamada?: string | null }
): string {
  return links?.videollamada ? plantillas.virtual : plantillas.general;
}

// `links` son los de `{confirmar}`/`{cancelar}` (ver turno-link-paciente.ts)
// y, solo en una teleconsulta, el de `{videollamada}`. Sin links (ej. la
// vista previa de Configuración) los placeholders quedan tal cual.
export function buildMensajeRecordatorio(
  template: string,
  nombre: string,
  turnoInicio: Date,
  ahora: Date = new Date(),
  links?: { confirmar: string; cancelar: string; videollamada?: string | null }
): string {
  let mensaje = template
    .replaceAll("{nombre}", nombre)
    .replaceAll("{fecha}", formatFechaRecordatorio(turnoInicio, ahora))
    .replaceAll("{hora}", formatHoraBA(turnoInicio));
  if (links) {
    mensaje = mensaje.replaceAll("{confirmar}", links.confirmar).replaceAll("{cancelar}", links.cancelar);
    if (links.videollamada) {
      // Si el médico sacó `{videollamada}` de la plantilla de teleconsulta,
      // el link se agrega igual al final (sin él el paciente no tiene cómo
      // entrar).
      mensaje = mensaje.includes("{videollamada}")
        ? mensaje.replaceAll("{videollamada}", links.videollamada)
        : `${mensaje}\n\nEs una teleconsulta: entrá desde acá a la hora del turno ${links.videollamada}`;
    } else {
      // Turno presencial: la variable no aplica (puede haber quedado en la
      // plantilla general de cuando era una sola para todos los turnos).
      mensaje = mensaje.replaceAll("{videollamada}", "");
    }
  }
  return mensaje;
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

// Link de WhatsApp sin destinatario: el usuario elige el chat al abrirlo.
export function buildWhatsAppShareHref(mensaje: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
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
