import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant";
import type { UserRole } from "@/lib/auth";
import type { ResumenAutomatico } from "@/components/patient-form/types";

type Config = {
  resumenAutomatico: boolean;
  resumenAutoAntecedentes: boolean;
  resumenAutoEvoluciones: boolean;
};

export const RESUMEN_AUTOMATICO_APAGADO: ResumenAutomatico = { antecedentes: false, evoluciones: false };

function desdeConfig(c: Config): ResumenAutomatico {
  return {
    antecedentes: c.resumenAutomatico && c.resumenAutoAntecedentes,
    evoluciones: c.resumenAutomatico && c.resumenAutoEvoluciones,
  };
}

/**
 * En qué campos se resume solo al terminar un dictado (ver Configuración >
 * Dictado e IA). La opción es del médico: una secretaria usa la del médico
 * activo, no la suya.
 */
export async function getResumenAutomatico(user: Config & {
  role: UserRole;
  id: string;
  activeDoctorId: string | null;
}): Promise<ResumenAutomatico> {
  if (user.role === "DOCTOR") return desdeConfig(user);
  if (user.role !== "SECRETARY" || !user.activeDoctorId) return RESUMEN_AUTOMATICO_APAGADO;
  const medico = await prisma.user.findUnique({
    where: { id: getTenantId(user) },
    select: { resumenAutomatico: true, resumenAutoAntecedentes: true, resumenAutoEvoluciones: true },
  });
  return medico ? desdeConfig(medico) : RESUMEN_AUTOMATICO_APAGADO;
}
