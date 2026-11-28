// Mails automáticos de activación del trial: a un médico que se registró y
// todavía no usa el sistema se le manda, de a uno, el mail que empuja el
// próximo paso que le falta. Cuando se activa (ver `estaActivado`) se corta la
// secuencia de activación y solo quedan los avisos de fin de trial.
//
// Este archivo es lógica pura (sin base ni Resend) para poder testearla; la
// corrida está en `engagement-server.ts` y los textos en `engagement-emails.ts`.

export const MAIL_ENGAGEMENT_TIPOS = [
  "CONFIGURAR_CONSULTORIO",
  "PRIMER_PACIENTE",
  "FUNDADOR",
  "PRIMER_TURNO",
  "PRIMER_DICTADO",
  "SEGUIMIENTO",
  "TRIAL_TERMINA_PRONTO",
  "TRIAL_TERMINA_MANANA",
  "TRIAL_VENCIDO",
] as const;

export type MailEngagementTipo = (typeof MAIL_ENGAGEMENT_TIPOS)[number];

export const MAIL_ENGAGEMENT_LABELS: Record<MailEngagementTipo, string> = {
  CONFIGURAR_CONSULTORIO: "Configurá tu consultorio",
  PRIMER_PACIENTE: "Cargá tu primer paciente",
  FUNDADOR: "Mail personal del fundador",
  PRIMER_TURNO: "Agendá tu primer turno",
  PRIMER_DICTADO: "Dictá tu primera consulta",
  SEGUIMIENTO: "Seguimiento (sigue sin actividad)",
  TRIAL_TERMINA_PRONTO: "La prueba termina en una semana",
  TRIAL_TERMINA_MANANA: "La prueba termina mañana",
  TRIAL_VENCIDO: "La prueba terminó",
};

export type Hitos = {
  lugares: number;
  horarios: number;
  pacientes: number;
  turnos: number;
  evoluciones: number;
  dictados: number;
};

export type DoctorEngagement = {
  plan: "BASICA" | "PREMIUM";
  createdAt: Date;
  trialEndsAt: Date | null;
  hitos: Hitos;
  enviados: { tipo: MailEngagementTipo; enviadoAt: Date }[];
};

const DIA_MS = 24 * 60 * 60 * 1000;

// Entre dos mails de activación pasan al menos estos días, para no saturar.
export const MIN_DIAS_ENTRE_MAILS = 3;
// Los avisos de fin de trial tienen fecha fija: solo se evita mandar dos el
// mismo día.
const MIN_DIAS_ENTRE_AVISOS_TRIAL = 1;
// Ventana para el mail "tu prueba terminó": a partir del día 3 después del
// fin y no más allá del 10 (pasado eso ya no tiene sentido mandarlo).
const TRIAL_VENCIDO_DESDE_DIA = 3;
const TRIAL_VENCIDO_HASTA_DIA = 10;
// Faltando estos días (o menos) para el fin del trial, ya no se mandan mails
// de activación: solo los avisos de fin de trial.
const DIAS_AVISO_TRIAL = 7;

// Día mínimo (desde el alta) en que se puede mandar cada mail de activación.
// El trial de Premium dura la mitad que el de Básico (30 vs 60 días), así que
// su secuencia va más comprimida.
const DIA_MINIMO: Record<"BASICA" | "PREMIUM", Partial<Record<MailEngagementTipo, number>>> = {
  BASICA: {
    CONFIGURAR_CONSULTORIO: 2,
    PRIMER_PACIENTE: 4,
    FUNDADOR: 6,
    PRIMER_TURNO: 10,
    SEGUIMIENTO: 20,
  },
  PREMIUM: {
    CONFIGURAR_CONSULTORIO: 2,
    PRIMER_PACIENTE: 4,
    FUNDADOR: 6,
    PRIMER_DICTADO: 9,
    PRIMER_TURNO: 12,
    SEGUIMIENTO: 15,
  },
};

export function perfilListo(h: Hitos): boolean {
  return h.lugares > 0 && h.horarios > 0;
}

// "Activado" = ya usa el sistema de verdad: varios pacientes y al menos un
// turno o una evolución. A partir de ahí no recibe más mails de activación.
export const PACIENTES_PARA_ACTIVADO = 3;
export function estaActivado(h: Hitos): boolean {
  return h.pacientes >= PACIENTES_PARA_ACTIVADO && (h.turnos > 0 || h.evoluciones > 0);
}

// Si el mail de activación todavía aplica a lo que hizo (o no) el médico.
function aplica(tipo: MailEngagementTipo, h: Hitos): boolean {
  switch (tipo) {
    case "CONFIGURAR_CONSULTORIO":
      return !perfilListo(h);
    case "PRIMER_PACIENTE":
      return h.pacientes === 0;
    case "FUNDADOR":
    case "SEGUIMIENTO":
      return true; // ya se filtró por "no activado"
    case "PRIMER_TURNO":
      return h.pacientes > 0 && h.turnos === 0;
    case "PRIMER_DICTADO":
      return h.pacientes > 0 && h.dictados === 0;
    default:
      return false;
  }
}

function diasEntre(desde: Date, hasta: Date): number {
  return Math.floor((hasta.getTime() - desde.getTime()) / DIA_MS);
}

type Opciones = {
  // Sin remitente personal configurado (EMAIL_FUNDADOR_*) ese mail se saltea.
  fundadorHabilitado: boolean;
};

/**
 * El mail que le toca hoy a este médico, o `null` si no le toca ninguno. Se
 * asume que ya es un candidato (médico en trial, sin pagar, sin baja de los
 * mails, ver `engagement-server.ts`).
 */
export function proximoMailEngagement(
  doctor: DoctorEngagement,
  ahora: Date,
  opciones: Opciones
): MailEngagementTipo | null {
  const yaEnviados = new Set(doctor.enviados.map((e) => e.tipo));
  const ultimo = doctor.enviados.reduce<Date | null>(
    (max, e) => (!max || e.enviadoAt > max ? e.enviadoAt : max),
    null
  );
  const diasDesdeUltimo = ultimo ? (ahora.getTime() - ultimo.getTime()) / DIA_MS : Infinity;

  // Días que faltan para el fin del trial (negativo = ya terminó).
  const diasParaFin = doctor.trialEndsAt
    ? Math.ceil((doctor.trialEndsAt.getTime() - ahora.getTime()) / DIA_MS)
    : null;

  // 1. Avisos de fin de trial: para todos, activados o no.
  if (diasParaFin !== null && diasDesdeUltimo >= MIN_DIAS_ENTRE_AVISOS_TRIAL) {
    const diasDesdeFin = -diasParaFin;
    if (diasDesdeFin >= TRIAL_VENCIDO_DESDE_DIA && diasDesdeFin <= TRIAL_VENCIDO_HASTA_DIA) {
      return yaEnviados.has("TRIAL_VENCIDO") ? null : "TRIAL_VENCIDO";
    }
    if (diasParaFin === 1 && !yaEnviados.has("TRIAL_TERMINA_MANANA")) {
      return "TRIAL_TERMINA_MANANA";
    }
    if (diasParaFin >= 2 && diasParaFin <= DIAS_AVISO_TRIAL && !yaEnviados.has("TRIAL_TERMINA_PRONTO")) {
      return "TRIAL_TERMINA_PRONTO";
    }
  }

  // 2. Secuencia de activación: solo con el trial vigente y lejos del fin.
  if (diasParaFin === null || diasParaFin <= DIAS_AVISO_TRIAL) return null;
  if (estaActivado(doctor.hitos)) return null;
  if (diasDesdeUltimo < MIN_DIAS_ENTRE_MAILS) return null;

  const diasDesdeAlta = diasEntre(doctor.createdAt, ahora);
  const secuencia = Object.entries(DIA_MINIMO[doctor.plan]) as [MailEngagementTipo, number][];
  for (const [tipo, diaMinimo] of secuencia) {
    if (diasDesdeAlta < diaMinimo) continue;
    if (yaEnviados.has(tipo)) continue;
    if (tipo === "FUNDADOR" && !opciones.fundadorHabilitado) continue;
    if (!aplica(tipo, doctor.hitos)) continue;
    return tipo;
  }
  return null;
}
