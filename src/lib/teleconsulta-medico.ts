import { prisma } from "@/lib/prisma";
import { teleconsultaHabilitada } from "@/lib/feature-flags";
import {
  TELECONSULTA_APAGADA,
  teleconsultaEfectiva,
  type TeleconsultaEfectiva,
} from "@/lib/teleconsulta-config";

export const TELECONSULTA_CONFIG_SELECT = {
  teleconsultaHabilitada: true,
  teleconsultaPasarPresenciales: true,
  teleconsultaLugarVirtual: true,
} as const;

// Qué puede hacer con la teleconsulta el médico `doctorId` (o su asistente:
// pasarle el tenant). Combina el flag de plataforma con Configuración >
// Teleconsulta del médico.
export async function getTeleconsultaDelMedico(doctorId: string): Promise<TeleconsultaEfectiva> {
  if (!teleconsultaHabilitada()) return TELECONSULTA_APAGADA;
  const config = await prisma.user.findUnique({
    where: { id: doctorId },
    select: TELECONSULTA_CONFIG_SELECT,
  });
  return config ? teleconsultaEfectiva(true, config) : TELECONSULTA_APAGADA;
}
