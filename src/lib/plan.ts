export const TRIAL_DIAS = 60;

// Faltando esta cantidad de días (o menos) para que se termine el trial de
// Básico, ya se puede contratar Básico desde "Mi plan" (antes de eso, el
// botón queda reemplazado por "Incluido en tu prueba") -- y es también la
// ventana en la que se le avisa al médico en el home que el trial está por
// terminar (ver `TrialPorTerminarAviso` / `diasRestantesDeTrial`).
export const DIAS_AVISO_TRIAL_POR_TERMINAR = 7;

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


export type PlanDuracion = "MENSUAL" | "SEMESTRAL" | "ANUAL" | "MESES_18" | "BIANUAL";

export const PLAN_DURACION_LABEL: Record<PlanDuracion, string> = {
  MENSUAL: "1 mes",
  SEMESTRAL: "6 meses",
  ANUAL: "12 meses",
  MESES_18: "18 meses",
  BIANUAL: "24 meses",
};

// Precios reales en ARS. Descuento respecto al precio mensual: 6 meses 5%,
// 12 meses 11%, 18 meses 15%, 24 meses 20%.
export const PLAN_PRICING: Record<"BASICA" | "PREMIUM", Record<PlanDuracion, number>> = {
  BASICA: { MENSUAL: 40000, SEMESTRAL: 38000, ANUAL: 35600, MESES_18: 34000, BIANUAL: 32000 },
  PREMIUM: { MENSUAL: 75000, SEMESTRAL: 71250, ANUAL: 66750, MESES_18: 63750, BIANUAL: 60000 },
};

export function precioMensualEquivalente(
  plan: "BASICA" | "PREMIUM",
  duracion: PlanDuracion
): number {
  return PLAN_PRICING[plan][duracion];
}

// Cuántos meses de acceso otorga cada duración -- MENSUAL se sigue
// facturando mes a mes (suscripción recurrente de MercadoPago); el resto
// ahora es un pago único por adelantado (ver `crearPreferencia` en
// `src/lib/mercadopago.ts`), así que esto es tanto "cuánto dura el acceso"
// como el multiplicador para calcular el total a cobrar de una vez.
export const MESES_POR_DURACION: Record<PlanDuracion, number> = {
  MENSUAL: 1,
  SEMESTRAL: 6,
  ANUAL: 12,
  MESES_18: 18,
  BIANUAL: 24,
};

// Monto total del pago único para duraciones != MENSUAL (el precio con
// descuento ya está expresado "por mes" en PLAN_PRICING; esto lo multiplica
// por la cantidad de meses que cubre esa duración).
export function precioTotalDuracion(plan: "BASICA" | "PREMIUM", duracion: PlanDuracion): number {
  return precioMensualEquivalente(plan, duracion) * MESES_POR_DURACION[duracion];
}

// Ventana en la que se le avisa en el home al médico con un pago único de
// 6 meses o más que su acceso está por terminar (ver `PlanPorVencerAviso`),
// y cuántos días antes del vencimiento el aviso pasa de ámbar a rojo.
export const DIAS_AVISO_PLAN_POR_VENCER = 14;
export const DIAS_AVISO_PLAN_URGENTE = 3;

// Días que le quedan a un pago único (duración != MENSUAL, que es
// recurrente y se renueva solo) de 6 meses o más, o `null` si no aplica.
export function diasRestantesDePagoUnico(user: {
  planDuracion: PlanDuracion | null;
  planEndsAt: Date | null;
}): number | null {
  if (!user.planEndsAt || !user.planDuracion) return null;
  if (MESES_POR_DURACION[user.planDuracion] < 6) return null;
  const ms = user.planEndsAt.getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export type CalculoUpgradePremium = {
  diasRestantes: number;
  mesesRestantes: number;
  // Premium por el tiempo que queda, al precio mensual de la duración vigente.
  totalPremium: number;
  // Lo que ese mismo tiempo de Básico ya está pago (se descuenta).
  creditoBasico: number;
  aPagar: number;
};

const DIAS_POR_MES = 30.4375;

// Upgrade de Básico a Premium sobre un pago único vigente: Premium arranca ya
// y termina en el mismo `planEndsAt`, así que se cobra solo la diferencia de
// precio por el tiempo que queda. Devuelve `null` si no hay nada que mejorar
// (recurrente, sin tiempo por delante, o duración sin precio). Lo calcula el
// servidor para cobrar y el cliente para mostrar -- misma función en ambos.
export function calcularUpgradePremium(
  user: { planDuracion: PlanDuracion | null; planEndsAt: Date | null },
  ahora: Date = new Date()
): CalculoUpgradePremium | null {
  const { planDuracion, planEndsAt } = user;
  if (!planDuracion || planDuracion === "MENSUAL" || !planEndsAt) return null;
  const diasRestantes = Math.ceil((planEndsAt.getTime() - ahora.getTime()) / (24 * 60 * 60 * 1000));
  if (diasRestantes <= 0) return null;
  const mesesRestantes = diasRestantes / DIAS_POR_MES;
  const totalPremium = Math.round(precioMensualEquivalente("PREMIUM", planDuracion) * mesesRestantes);
  const creditoBasico = Math.round(precioMensualEquivalente("BASICA", planDuracion) * mesesRestantes);
  const aPagar = totalPremium - creditoBasico;
  if (aPagar <= 0) return null;
  return { diasRestantes, mesesRestantes, totalPremium, creditoBasico, aPagar };
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
