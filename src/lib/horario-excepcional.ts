import { prisma } from "@/lib/prisma";
import { startOfDayBA } from "@/lib/timezone";
import type { AperturaLike } from "@/lib/slots";

// Aperturas vigentes de UN día puntual -- para alimentar `generarSlots`
// cuando se arma la grilla de ese día (panel interno, directorio público,
// o el recálculo server-side de "bloques reales" al bloquear/desbloquear).
export async function getAperturasDelDia(
  userId: string,
  date: Date,
  lugarId?: string
): Promise<AperturaLike[]> {
  const dayStart = startOfDayBA(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return prisma.horarioExcepcional.findMany({
    where: {
      userId,
      inicio: { lt: dayEnd },
      fin: { gt: dayStart },
      ...(lugarId ? { lugarId } : {}),
    },
    select: { inicio: true, fin: true, lugarId: true },
  });
}

// Todas las aperturas que se solapan con un horizonte de varios días --
// para no hacer una consulta por día dentro de un loop (ver
// `getDisponibilidadPublica`). El llamador filtra cada una contra el día
// puntual que le toca dentro del horizonte.
export async function getAperturasDelHorizonte(
  userId: string,
  desde: Date,
  hasta: Date
): Promise<AperturaLike[]> {
  return prisma.horarioExcepcional.findMany({
    where: {
      userId,
      inicio: { lt: hasta },
      fin: { gt: desde },
    },
    select: { inicio: true, fin: true, lugarId: true },
  });
}

// Si al cancelar (o mover) un turno ya no queda ningún turno CONFIRMADO
// dentro del rango de una `HorarioExcepcional` de `fecha`+`lugarId`, esa
// apertura se borra -- el día vuelve a su estado original de "no
// disponible" en vez de quedar abierto indefinidamente a nuevos turnos sin
// que nadie lo haya pedido. No hace nada si no hay ninguna apertura ese
// día (caso normal, la inmensa mayoría de las cancelaciones).
export async function limpiarAperturasSinTurnos(
  userId: string,
  lugarId: string,
  fecha: Date
): Promise<void> {
  const dayStart = startOfDayBA(fecha);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const aperturas = await prisma.horarioExcepcional.findMany({
    where: { userId, lugarId, inicio: { lt: dayEnd }, fin: { gt: dayStart } },
  });

  for (const apertura of aperturas) {
    const hayTurnos = await prisma.turno.count({
      where: {
        doctorId: userId,
        lugarId,
        estado: "CONFIRMADO",
        inicio: { gte: apertura.inicio, lt: apertura.fin },
      },
    });
    if (hayTurnos === 0) {
      await prisma.horarioExcepcional.delete({ where: { id: apertura.id } });
    }
  }
}
