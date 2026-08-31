import { prisma } from "@/lib/prisma";
import { diaSemanaFromDate, type DiaSemana } from "@/lib/slots";

export type ScheduleBlockParams = {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
};

function estaCubierto(inicio: Date, blocks: ScheduleBlockParams[]): boolean {
  const dia = diaSemanaFromDate(inicio);
  const hora = `${String(inicio.getHours()).padStart(2, "0")}:${String(inicio.getMinutes()).padStart(2, "0")}`;
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
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [turnos, blocks] = await Promise.all([
    prisma.turno.findMany({
      where: { estado: "CONFIRMADO", inicio: { gte: todayStart } },
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
