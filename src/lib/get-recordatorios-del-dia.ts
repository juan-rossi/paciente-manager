import { prisma } from "@/lib/prisma";
import { startOfDayBA } from "@/lib/timezone";
import type { DiaSemana } from "@/lib/slots";
import { asegurarLinkCodigos, linkPaciente } from "@/lib/turno-link-paciente";

export type RecordatorioTurno = {
  id: string;
  nombreYApellido: string;
  telefono: string;
  inicio: string;
  recordatorioEnviado: boolean;
  confirmado: boolean;
  // Los de `{confirmar}`/`{cancelar}` de la plantilla.
  links: { confirmar: string; cancelar: string };
};

// Mismo criterio que `getDaySlots` para turnos: una secretaria solo ve los
// del lugar que tiene activo (`lugarId === undefined` para un DOCTOR, sin
// restricción; un `lugarId` string para acotar; `null` para "sin ningún
// lugar asignado", que no ve nada).
export async function getRecordatoriosDelDia(
  date: Date,
  tenantId: string,
  lugarId?: string | null
): Promise<{
  turnos: RecordatorioTurno[];
  diasConHorario: DiaSemana[];
  sinConfigurar: boolean;
}> {
  if (lugarId === null) {
    return { turnos: [], diasConHorario: [], sinConfigurar: true };
  }

  const blocks = await prisma.workScheduleBlock.findMany({
    where: { userId: tenantId, ...(lugarId ? { lugarId } : {}) },
    select: { diaSemana: true },
  });
  const diasConHorario = [...new Set(blocks.map((b) => b.diaSemana as DiaSemana))];

  const dayStart = startOfDayBA(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const turnos = await prisma.turno.findMany({
    where: {
      doctorId: tenantId,
      inicio: { gte: dayStart, lt: dayEnd },
      estado: "CONFIRMADO",
      ...(lugarId ? { lugarId } : {}),
    },
    orderBy: { inicio: "asc" },
    select: {
      id: true,
      nombreYApellido: true,
      telefono: true,
      inicio: true,
      recordatorioEnviado: true,
      confirmadoAt: true,
      linkCodigo: true,
    },
  });
  const codigos = await asegurarLinkCodigos(turnos);

  return {
    turnos: turnos.map((t) => {
      const codigo = codigos.get(t.id)!;
      return {
        id: t.id,
        nombreYApellido: t.nombreYApellido,
        telefono: t.telefono,
        inicio: t.inicio.toISOString(),
        recordatorioEnviado: t.recordatorioEnviado,
        confirmado: t.confirmadoAt !== null,
        links: { confirmar: linkPaciente(codigo, "si"), cancelar: linkPaciente(codigo, "no") },
      };
    }),
    diasConHorario,
    sinConfigurar: blocks.length === 0,
  };
}
