import { prisma } from "@/lib/prisma";
import { teleconsultaHabilitada } from "@/lib/feature-flags";
import { montoDeTeleconsulta } from "@/lib/teleconsulta-cobro";
import type { AvisoPasoTeleconsulta } from "@/lib/recordatorio-mensaje";
import {
  planPermiteTeleconsulta,
  TELECONSULTA_APAGADA,
  teleconsultaEfectiva,
  type TeleconsultaEfectiva,
} from "@/lib/teleconsulta-config";

export const TELECONSULTA_CONFIG_SELECT = {
  teleconsultaHabilitada: true,
  teleconsultaPasarPresenciales: true,
  teleconsultaLugarVirtual: true,
} as const;

const PLAN_SELECT = { plan: true, trialEndsAt: true, planEndsAt: true } as const;

// Qué puede hacer con la teleconsulta el médico `doctorId` (o su asistente:
// pasarle el tenant). Combina el flag de plataforma, el plan Premium y
// Configuración > Teleconsulta del médico.
export async function getTeleconsultaDelMedico(doctorId: string): Promise<TeleconsultaEfectiva> {
  if (!teleconsultaHabilitada()) return TELECONSULTA_APAGADA;
  const medico = await prisma.user.findUnique({
    where: { id: doctorId },
    select: { ...TELECONSULTA_CONFIG_SELECT, ...PLAN_SELECT },
  });
  if (!medico) return TELECONSULTA_APAGADA;
  return teleconsultaEfectiva(planPermiteTeleconsulta(medico), medico);
}

// Para entrar a la sala de un turno que ya es teleconsulta solo importa el
// plan (no la configuración: un turno pasado antes de apagarla se sigue
// pudiendo atender). Sin Premium vigente no se abren salas de video.
export async function medicoPuedeUsarSalas(doctorId: string): Promise<boolean> {
  if (!teleconsultaHabilitada()) return false;
  const medico = await prisma.user.findUnique({ where: { id: doctorId }, select: PLAN_SELECT });
  return !!medico && planPermiteTeleconsulta(medico);
}

// Plantilla y cobro del médico para el aviso de "pasó a teleconsulta" (ver
// `buildMensajePasoTeleconsulta`). El asistente usa los del médico: pasarle el tenant.
export function getAvisoPasoTeleconsulta(doctorId: string): Promise<AvisoPasoTeleconsulta> {
  return getPlantillaTeleconsulta(doctorId, "mensajeTemplatePasoTeleconsulta");
}

// Plantilla del recordatorio de teleconsulta (`User.mensajeTemplateVirtual`)
// y cobro, para el WhatsApp que se ofrece al reservar un turno en un lugar de
// Teleconsulta (ver `buildMensajeRecordatorio`).
export function getRecordatorioTeleconsulta(doctorId: string): Promise<AvisoPasoTeleconsulta> {
  return getPlantillaTeleconsulta(doctorId, "mensajeTemplateVirtual");
}

async function getPlantillaTeleconsulta(
  doctorId: string,
  campo: "mensajeTemplatePasoTeleconsulta" | "mensajeTemplateVirtual"
): Promise<AvisoPasoTeleconsulta> {
  const medico = await prisma.user.findUniqueOrThrow({
    where: { id: doctorId },
    select: {
      mensajeTemplatePasoTeleconsulta: true,
      mensajeTemplateVirtual: true,
      teleconsultaCobro: true,
      aliasCobro: true,
      montoTeleconsulta: true,
      montoTeleconsultaUsaParticular: true,
      montoConsultaParticular: true,
    },
  });
  return {
    plantilla: medico[campo],
    cobro: {
      teleconsultaCobro: medico.teleconsultaCobro,
      aliasCobro: medico.aliasCobro,
      monto: montoDeTeleconsulta(medico, medico.montoConsultaParticular),
    },
  };
}
