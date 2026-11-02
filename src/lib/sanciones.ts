import { prisma } from "@/lib/prisma";
import { planLabelDe } from "@/lib/admin-metrics";
import type { TipoSancion } from "@/lib/sancion-email";

export type { TipoSancion };

// Filtro para todo lo que se muestra al público (directorio, perfil, agenda
// pública, sitemap, placas de marketing): un médico suspendido o sacado del
// directorio no aparece en ningún lado, tenga los switches como los tenga.
export const SIN_SANCION = { suspendidoAt: null, fueraDelDirectorioAt: null } as const;

// Qué sanción ofrece /admin/moderacion según el plan: a quien está en período
// de prueba (vigente o vencido) se lo suspende; a quien paga se le saca el
// perfil del directorio y sigue usando la app. Mismo criterio que el rótulo de
// plan de la tarjeta ("Trial · Básico" vs "Premium · Anual").
export function sancionQueCorresponde(doctor: Parameters<typeof planLabelDe>[0]): TipoSancion {
  return planLabelDe(doctor).esTrial ? "SUSPENSION" : "FUERA_DEL_DIRECTORIO";
}

export function sancionActual(doctor: {
  suspendidoAt: Date | null;
  fueraDelDirectorioAt: Date | null;
}): TipoSancion | null {
  if (doctor.suspendidoAt) return "SUSPENSION";
  if (doctor.fueraDelDirectorioAt) return "FUERA_DEL_DIRECTORIO";
  return null;
}

export const SANCION_LABELS: Record<TipoSancion, string> = {
  SUSPENSION: "Suspendido",
  FUERA_DEL_DIRECTORIO: "Fuera del directorio",
};

// Turnos a futuro y secretarias que siguen operando la cuenta: el diálogo de
// suspensión los muestra para que el admin sepa a quién más afecta.
export async function afectadosPorSuspension(doctorId: string) {
  const [turnosFuturos, secretarias] = await Promise.all([
    prisma.turno.count({ where: { doctorId, estado: "CONFIRMADO", inicio: { gte: new Date() } } }),
    prisma.doctorSecretaria.count({ where: { doctorId, aceptadaAt: { not: null } } }),
  ]);
  return { turnosFuturos, secretarias };
}
