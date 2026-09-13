export const TRIAL_MESES = 3;

export function nuevaFechaFinTrial(desde: Date = new Date()): Date {
  const fin = new Date(desde);
  fin.setMonth(fin.getMonth() + TRIAL_MESES);
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
    "Transcripción de audio (dictado)",
    "Recordatorios de turnos por WhatsApp (manual)",
  ],
  PREMIUM: [
    "Todo lo de Básica",
    "Resúmenes y autocompletado de campos con IA",
    "Envío automático de recordatorios por WhatsApp",
  ],
};
