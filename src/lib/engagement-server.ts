import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { proximoMailEngagement, type MailEngagementTipo } from "@/lib/engagement";
import { mailEngagement } from "@/lib/engagement-emails";
import { urlApiBaja, urlPaginaBaja } from "@/lib/engagement-baja";
import { engagementEmailsHabilitados } from "@/lib/feature-flags";

const DIA_MS = 24 * 60 * 60 * 1000;
// Tope de mails por corrida (Resend permite ~2 por segundo y el cron tiene un
// tiempo máximo). Lo que no entra sale al día siguiente.
const MAX_ENVIOS_POR_CORRIDA = 100;
const PAUSA_ENTRE_ENVIOS_MS = 600;
// El último aviso (`TRIAL_VENCIDO`) sale hasta 10 días después del fin.
const DIAS_DESPUES_DEL_FIN = 11;

// Remitente "personal" para el mail del fundador. Si falta alguna variable,
// ese mail se saltea (la secuencia sigue con el resto).
export function remitenteFundador(): { nombre: string; from: string; replyTo: string } | null {
  const nombre = process.env.EMAIL_FUNDADOR_NOMBRE?.trim();
  const from = process.env.EMAIL_FUNDADOR_FROM?.trim();
  const replyTo = process.env.EMAIL_FUNDADOR_REPLY_TO?.trim();
  return nombre && from && replyTo ? { nombre, from, replyTo } : null;
}

// Fecha de corte (ENGAGEMENT_EMAILS_DESDE): solo médicos registrados desde ahí.
export function fechaCorteEngagement(): Date | null {
  const raw = process.env.ENGAGEMENT_EMAILS_DESDE?.trim();
  if (!raw) return null;
  const fecha = new Date(`${raw}T00:00:00-03:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Evoluciones (no borradas) de cada médico, en una sola consulta: cuelgan del
// paciente, así que no salen con el `_count` del médico.
export async function contarEvolucionesPorDoctor(doctorIds: string[]): Promise<Map<string, number>> {
  if (doctorIds.length === 0) return new Map();
  const filas = await prisma.$queryRaw<{ doctorId: string; n: number }[]>(Prisma.sql`
    SELECT p."doctorId" AS "doctorId", COUNT(*)::int AS n
    FROM "PatientEvolucion" e
    JOIN "Patient" p ON p.id = e."patientId"
    WHERE e."deletedAt" IS NULL AND p."deletedAt" IS NULL AND p."doctorId" IN (${Prisma.join(doctorIds)})
    GROUP BY p."doctorId"
  `);
  return new Map(filas.map((f) => [f.doctorId, f.n]));
}

export type ResultadoCorrida = {
  modo: "envio" | "prueba";
  candidatos: number;
  enviados: number;
  errores: number;
  detalle: { doctorId: string; tipo: MailEngagementTipo; estado: "enviado" | "simulado" | "error" }[];
};

export async function correrEngagement(baseUrl: string, ahora: Date = new Date()): Promise<ResultadoCorrida> {
  const envio = engagementEmailsHabilitados();
  const desde = fechaCorteEngagement();
  if (envio && !desde) {
    throw new Error("ENGAGEMENT_EMAILS=true necesita ENGAGEMENT_EMAILS_DESDE (AAAA-MM-DD).");
  }
  const fundador = remitenteFundador();

  // Candidatos: médicos en trial (nunca pagaron, sin bonificar), con la
  // cuenta en pie y que no se dieron de baja de estos mails.
  const candidatos = await prisma.user.findMany({
    where: {
      role: "DOCTOR",
      isAdmin: false,
      bonificado: false,
      eliminadaAt: null,
      bajaAt: null,
      suspendidoAt: null,
      recibeMailsEngagement: true,
      planEndsAt: null,
      OR: [{ mpPreapprovalStatus: null }, { mpPreapprovalStatus: { not: "AUTHORIZED" } }],
      trialEndsAt: { gt: new Date(ahora.getTime() - DIAS_DESPUES_DEL_FIN * DIA_MS) },
      ...(desde ? { createdAt: { gte: desde } } : {}),
    },
    select: {
      id: true,
      email: true,
      nombre: true,
      apellido: true,
      tituloCortesia: true,
      plan: true,
      createdAt: true,
      trialEndsAt: true,
      mailsEngagement: { select: { tipo: true, enviadoAt: true } },
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
    orderBy: { createdAt: "asc" },
  });

  const resultado: ResultadoCorrida = {
    modo: envio ? "envio" : "prueba",
    candidatos: candidatos.length,
    enviados: 0,
    errores: 0,
    detalle: [],
  };

  const evolucionesPorDoctor = await contarEvolucionesPorDoctor(candidatos.map((c) => c.id));

  for (const doc of candidatos) {
    if (resultado.enviados + resultado.errores >= MAX_ENVIOS_POR_CORRIDA) break;

    const evoluciones = evolucionesPorDoctor.get(doc.id) ?? 0;
    const tipo = proximoMailEngagement(
      {
        plan: doc.plan,
        createdAt: doc.createdAt,
        trialEndsAt: doc.trialEndsAt,
        hitos: {
          lugares: doc._count.lugaresDeTrabajo,
          horarios: doc._count.workScheduleBlocks,
          pacientes: doc._count.pacientes,
          turnos: doc._count.turnosDelDoctor,
          evoluciones,
          dictados: doc._count.usosIA,
        },
        enviados: doc.mailsEngagement,
      },
      ahora,
      { fundadorHabilitado: Boolean(fundador) }
    );
    if (!tipo) continue;

    if (!envio) {
      resultado.detalle.push({ doctorId: doc.id, tipo, estado: "simulado" });
      continue;
    }

    // Primero se reserva la fila (unique doctorId+tipo): si dos corridas se
    // pisan, solo una manda. Si el envío falla se borra para reintentar mañana.
    const reserva = await prisma.mailEngagement
      .create({ data: { doctorId: doc.id, tipo, enviadoAt: ahora } })
      .catch(() => null);
    if (!reserva) continue;

    try {
      const mail = mailEngagement(tipo, doc, {
        baseUrl,
        urlBaja: urlPaginaBaja(baseUrl, doc.id),
        fundadorNombre: fundador?.nombre,
      });
      await sendEmail({
        to: doc.email,
        ...mail,
        ...(tipo === "FUNDADOR" && fundador ? { from: fundador.from, replyTo: fundador.replyTo } : {}),
        headers: {
          "List-Unsubscribe": `<${urlApiBaja(baseUrl, doc.id)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      resultado.enviados++;
      resultado.detalle.push({ doctorId: doc.id, tipo, estado: "enviado" });
    } catch (error) {
      console.error(`[engagement] no se pudo mandar ${tipo} a ${doc.id}`, error);
      await prisma.mailEngagement.delete({ where: { id: reserva.id } }).catch(() => {});
      resultado.errores++;
      resultado.detalle.push({ doctorId: doc.id, tipo, estado: "error" });
    }
    await new Promise((r) => setTimeout(r, PAUSA_ENTRE_ENVIOS_MS));
  }

  return resultado;
}
