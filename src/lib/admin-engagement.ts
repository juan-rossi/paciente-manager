import { prisma } from "@/lib/prisma";
import { estaActivado, MAIL_ENGAGEMENT_TIPOS, perfilListo, type MailEngagementTipo } from "@/lib/engagement";
import { contarEvolucionesPorDoctor, fechaCorteEngagement, remitenteFundador } from "@/lib/engagement-server";
import { engagementEmailsHabilitados } from "@/lib/feature-flags";

const DIA_MS = 24 * 60 * 60 * 1000;
const SEMANAS = 8;

export type CohorteEngagement = {
  desde: Date;
  registrados: number;
  perfilListo: number;
  conPacientes: number;
  activados: number;
  pagaron: number;
};

export type ResumenEngagement = {
  config: { enviando: boolean; desde: Date | null; fundador: string | null };
  cohortes: CohorteEngagement[];
  mails: { tipo: MailEngagementTipo; total: number; ultimos30: number }[];
  bajas: number;
};

// Lunes 00:00 (hora de Argentina, UTC-3) de la semana de `fecha`.
function inicioSemana(fecha: Date): Date {
  const ar = new Date(fecha.getTime() - 3 * 60 * 60 * 1000);
  const diasDesdeLunes = (ar.getUTCDay() + 6) % 7;
  const lunes = Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate() - diasDesdeLunes);
  return new Date(lunes + 3 * 60 * 60 * 1000);
}

export async function getResumenEngagement(ahora: Date = new Date()): Promise<ResumenEngagement> {
  const primeraSemana = new Date(inicioSemana(ahora).getTime() - (SEMANAS - 1) * 7 * DIA_MS);
  const hace30 = new Date(ahora.getTime() - 30 * DIA_MS);

  const [medicos, porTipo, porTipo30, bajas] = await Promise.all([
    // Mismo universo que la conversión del dashboard: sin bonificados ni admins.
    prisma.user.findMany({
      where: {
        role: "DOCTOR",
        isAdmin: false,
        bonificado: false,
        eliminadaAt: null,
        createdAt: { gte: primeraSemana },
      },
      select: {
        id: true,
        createdAt: true,
        planEndsAt: true,
        _count: {
          select: {
            lugaresDeTrabajo: { where: { deletedAt: null } },
            workScheduleBlocks: true,
            pacientes: { where: { deletedAt: null } },
            turnosDelDoctor: true,
            usosIA: { where: { tipo: "DICTADO" } },
          },
        },
      },
    }),
    prisma.mailEngagement.groupBy({ by: ["tipo"], _count: { _all: true } }),
    prisma.mailEngagement.groupBy({ by: ["tipo"], where: { enviadoAt: { gte: hace30 } }, _count: { _all: true } }),
    prisma.user.count({ where: { role: "DOCTOR", recibeMailsEngagement: false } }),
  ]);

  const evoluciones = await contarEvolucionesPorDoctor(medicos.map((m) => m.id));

  const cohortes: CohorteEngagement[] = Array.from({ length: SEMANAS }, (_, i) => ({
    desde: new Date(primeraSemana.getTime() + i * 7 * DIA_MS),
    registrados: 0,
    perfilListo: 0,
    conPacientes: 0,
    activados: 0,
    pagaron: 0,
  }));
  for (const m of medicos) {
    const idx = Math.floor((m.createdAt.getTime() - primeraSemana.getTime()) / (7 * DIA_MS));
    const c = cohortes[idx];
    if (!c) continue;
    const hitos = {
      lugares: m._count.lugaresDeTrabajo,
      horarios: m._count.workScheduleBlocks,
      pacientes: m._count.pacientes,
      turnos: m._count.turnosDelDoctor,
      evoluciones: evoluciones.get(m.id) ?? 0,
      dictados: m._count.usosIA,
    };
    c.registrados++;
    if (perfilListo(hitos)) c.perfilListo++;
    if (hitos.pacientes > 0) c.conPacientes++;
    if (estaActivado(hitos)) c.activados++;
    if (m.planEndsAt) c.pagaron++;
  }

  const total = new Map(porTipo.map((r) => [r.tipo, r._count._all]));
  const ult30 = new Map(porTipo30.map((r) => [r.tipo, r._count._all]));

  return {
    config: {
      enviando: engagementEmailsHabilitados(),
      desde: fechaCorteEngagement(),
      fundador: remitenteFundador()?.nombre ?? null,
    },
    cohortes: cohortes.reverse(),
    mails: MAIL_ENGAGEMENT_TIPOS.map((tipo) => ({
      tipo,
      total: total.get(tipo) ?? 0,
      ultimos30: ult30.get(tipo) ?? 0,
    })),
    bajas,
  };
}
