export const TRIAL_DIAS = 60;

export function nuevaFechaFinTrial(desde: Date = new Date()): Date {
  const fin = new Date(desde);
  fin.setDate(fin.getDate() + TRIAL_DIAS);
  return fin;
}

// Margen antes de restringir el acceso cuando falla un cobro recurrente de
// MercadoPago -- ver `/api/mercadopago/webhook` y `pagoEnGracia` en `User`.
export const GRACIA_DIAS = 5;

export function nuevaFechaFinGracia(desde: Date = new Date()): Date {
  const fin = new Date(desde);
  fin.setDate(fin.getDate() + GRACIA_DIAS);
  return fin;
}

type PlanUser = {
  plan: "BASICA" | "PREMIUM";
  trialEndsAt: Date | null;
};

export function isPremium(user: PlanUser): boolean {
  return user.plan === "PREMIUM";
}

export function trialActivo(user: PlanUser): boolean {
  return Boolean(user.trialEndsAt && user.trialEndsAt.getTime() > Date.now());
}

export function diasRestantesDeTrial(user: PlanUser): number | null {
  if (!user.trialEndsAt) return null;
  const ms = user.trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export const PLAN_FEATURES: Record<"BASICA" | "PREMIUM", string[]> = {
  BASICA: [
    "Historia clínica de pacientes",
    "Asignación de turnos",
    "Recordatorios de turnos por WhatsApp (manual)",
    "Usuarios de tipo Secretario/a",
    "Listado en Directorio de profesionales",
    "Agenda pública",
  ],
  PREMIUM: [
    "Todo lo de Básico",
    "Transcripción de audio (dictado)",
    "Resúmenes y autocompletado de campos con IA",
    "Envío automático de recordatorios por WhatsApp",
  ],
};


export type PlanDuracion = "MENSUAL" | "SEMESTRAL" | "ANUAL" | "BIANUAL";

export const PLAN_DURACION_LABEL: Record<PlanDuracion, string> = {
  MENSUAL: "1 mes",
  SEMESTRAL: "6 meses",
  ANUAL: "12 meses",
  BIANUAL: "24 meses",
};

// Precios reales en ARS. Cuanto más larga la duración, menor el precio
// mensual equivalente -- mismos % de descuento relativos al mensual que ya
// existían antes de definir el precio final.
export const PLAN_PRICING: Record<"BASICA" | "PREMIUM", Record<PlanDuracion, number>> = {
  BASICA: { MENSUAL: 40000, SEMESTRAL: 35000, ANUAL: 29000, BIANUAL: 24000 },
  PREMIUM: { MENSUAL: 75000, SEMESTRAL: 63000, ANUAL: 54000, BIANUAL: 45000 },
};

export function precioMensualEquivalente(
  plan: "BASICA" | "PREMIUM",
  duracion: PlanDuracion
): number {
  return PLAN_PRICING[plan][duracion];
}

type EstadoCuentaUser = {
  trialEndsAt: Date | null;
  planEndsAt: Date | null;
};

// "Activo" para el panel de owner/admin: trial vigente O suscripción paga
// vigente. No hay toggle manual todavía (fase futura) -- se calcula solo
// por fecha, en cada consulta, nunca se guarda en la fila del médico.
export function esActivo(user: EstadoCuentaUser): boolean {
  const ahora = Date.now();
  const trialVigente = Boolean(user.trialEndsAt && user.trialEndsAt.getTime() > ahora);
  const planVigente = Boolean(user.planEndsAt && user.planEndsAt.getTime() > ahora);
  return trialVigente || planVigente;
}

// La fecha de vencimiento "relevante" para mostrar en el panel: si ya hay
// una suscripción paga cargada (`planEndsAt`), esa es la que importa
// (reemplaza al trial, incluso si el trial en papel ya venció). Si todavía
// no convirtió, es la fecha de fin de trial.
export function fechaVencimientoRelevante(user: EstadoCuentaUser): Date | null {
  if (user.planEndsAt) return user.planEndsAt;
  return user.trialEndsAt;
}

export function diasParaFecha(fecha: Date | null, desde: Date = new Date()): number | null {
  if (!fecha) return null;
  const ms = fecha.getTime() - desde.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
