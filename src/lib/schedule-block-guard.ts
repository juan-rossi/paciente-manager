import { prisma } from "@/lib/prisma";
import { diaSemanaFromDate, type DiaSemana } from "@/lib/slots";
import { formatHoraBA, startOfDayBA } from "@/lib/timezone";

export type ScheduleBlockParams = {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
};

function estaCubierto(inicio: Date, blocks: ScheduleBlockParams[]): boolean {
  const dia = diaSemanaFromDate(inicio);
  const hora = formatHoraBA(inicio);
  return blocks.some((b) => b.diaSemana === dia && hora >= b.horaInicio && hora < b.horaFin);
}

/**
 * Turnos (de hoy en adelante, confirmados) que hoy tienen cobertura horaria pero la
 * perderían si se aplica el cambio propuesto sobre el bloque `blockId`. Pasar
 * `proposedBlock: null` simula su eliminación. Así, ampliar un bloque (o modificarlo sin
 * sacar cobertura a nadie) nunca bloquea la acción — solo lo hace si algún turno existente
 * quedaría sin ningún bloque que lo cubra.
 */
export async function countTurnosSinCoberturaTrasCambio(
  userId: string,
  blockId: string,
  proposedBlock: ScheduleBlockParams | null
): Promise<number> {
  const todayStart = startOfDayBA(new Date());

  const [turnos, blocks] = await Promise.all([
    prisma.turno.findMany({
      where: { doctorId: userId, estado: "CONFIRMADO", inicio: { gte: todayStart } },
      select: { inicio: true },
    }),
    prisma.workScheduleBlock.findMany({ where: { userId } }),
  ]);

  const allBlocks: (ScheduleBlockParams & { id: string })[] = blocks;

  const blocksDespues: ScheduleBlockParams[] = [
    ...allBlocks.filter((b) => b.id !== blockId),
    ...(proposedBlock ? [proposedBlock] : []),
  ];

  return turnos.filter(
    (t) => estaCubierto(t.inicio, allBlocks) && !estaCubierto(t.inicio, blocksDespues)
  ).length;
}

export type ConflictoHorario = {
  lugarLabel: string;
  horaInicio: string;
  horaFin: string;
};

/**
 * Busca, entre TODOS los bloques del médico (sin importar el lugar al que
 * pertenezcan), uno que se superponga con el horario propuesto el mismo
 * día -- un médico no puede estar en dos lugares a la vez, así que la
 * superposición se valida cruzando lugares, no solo dentro de uno.
 * `excludeBlockId` se usa al editar, para no chocar contra sí mismo.
 */
export async function encontrarSolapamiento(
  userId: string,
  diaSemana: DiaSemana,
  horaInicio: string,
  horaFin: string,
  excludeBlockId?: string
): Promise<ConflictoHorario | null> {
  const blocks = await prisma.workScheduleBlock.findMany({
    where: {
      userId,
      diaSemana,
      ...(excludeBlockId ? { id: { not: excludeBlockId } } : {}),
    },
    include: { lugar: true },
  });

  const conflicto = blocks.find((b) => horaInicio < b.horaFin && b.horaInicio < horaFin);
  if (!conflicto) return null;

  return {
    lugarLabel: conflicto.lugar?.nombre ?? "Particular",
    horaInicio: conflicto.horaInicio,
    horaFin: conflicto.horaFin,
  };
}
