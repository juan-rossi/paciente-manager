import { prisma } from "@/lib/prisma";
import { generarSlots, type WorkScheduleBlockLike } from "@/lib/slots";
import { agruparPorLugar, bloquesDelDia } from "@/lib/bloques-dia";
import { startOfDayBA } from "@/lib/timezone";

export type BloqueoRango = { lugarId: string | null; inicio: Date; fin: Date };

// `lugarId: null` en un bloqueo significa "aplica a cualquier lugar" (el
// "Día completo" de un médico) -- por eso nunca alcanza con comparar
// `bloqueo.lugarId === lugarId` a secas.
export function isRangoBloqueado(
  slotInicio: Date,
  lugarId: string,
  bloqueos: BloqueoRango[]
): boolean {
  return bloqueos.some(
    (b) =>
      (b.lugarId === null || b.lugarId === lugarId) &&
      slotInicio >= b.inicio &&
      slotInicio < b.fin
  );
}

// "Día completo": una sola fila que cubre las 24hs de `fecha`. Para un
// médico, `lugarId: null` (todos sus lugares); para una secretaria, se le
// pasa su `activeLugarId` (nunca puede bloquear un lugar que no administra).
export async function crearBloqueoDia(
  userId: string,
  lugarId: string | null,
  fecha: Date,
  motivo: string | null
) {
  const inicio = startOfDayBA(fecha);
  const fin = startOfDayBA(new Date(fecha.getTime() + 24 * 60 * 60 * 1000));
  return prisma.bloqueoHorario.create({ data: { userId, lugarId, inicio, fin, motivo } });
}

export class BloqueoSinBloquesError extends Error {}

// "Bloques específicos": nunca confía en los rangos horarios que mande el
// cliente (mismo criterio que `buscarSlotValido` en public-booking.ts) --
// recalcula los bloques REALES de `fecha` server-side a partir del
// `WorkScheduleBlock` vigente y solo crea filas para los `bloqueKeys` que
// matchean uno de verdad. `scopeLugarId` acota qué bloques puede ver quien
// pide el bloqueo: `undefined` para un médico (ve todos sus lugares), un
// id concreto para una secretaria (sus bloques nunca van a incluir un
// lugar que no administra, porque ni siquiera se computan).
export async function crearBloqueosDeBloques(
  userId: string,
  scopeLugarId: string | undefined,
  fecha: Date,
  bloqueKeys: string[],
  motivo: string | null
) {
  const doctor = await prisma.user.findUnique({
    where: { id: userId },
    select: { slotDurationMinutes: true },
  });
  if (!doctor) throw new BloqueoSinBloquesError("Médico no encontrado.");

  const blocks: WorkScheduleBlockLike[] = await prisma.workScheduleBlock.findMany({
    where: { userId, ...(scopeLugarId ? { lugarId: scopeLugarId } : {}) },
  });
  const slots = generarSlots(fecha, blocks, doctor.slotDurationMinutes);
  const slotsIso = slots.map((s) => ({
    inicio: s.inicio.toISOString(),
    fin: s.fin.toISOString(),
    lugarId: s.lugarId,
  }));
  const grupos = agruparPorLugar(slotsIso, []);
  const bloquesReales = bloquesDelDia(grupos);
  const matched = bloquesReales.filter((b) => bloqueKeys.includes(b.key));

  if (matched.length === 0) {
    throw new BloqueoSinBloquesError("Ninguno de los bloques elegidos corresponde a un horario real de ese día.");
  }

  return prisma.bloqueoHorario.createMany({
    data: matched.map((b) => ({
      userId,
      lugarId: b.lugarId,
      inicio: new Date(b.inicio),
      fin: new Date(b.fin),
      motivo,
    })),
  });
}

// Un bloqueo "Día completo" (`lugarId: null`) se ve en la grilla como una
// card por cada lugar que tiene horario ese día -- todas comparten el mismo
// `bloqueoId`, pero "Desbloquear" en UNA de esas cards nunca debe levantar
// el bloqueo de los demás lugares (ver el pedido del usuario: cada botón
// afecta solo al bloque/lugar donde está, no a todo el día). Como el
// bloqueo real es una única fila sin lugar propio, "desbloquear un lugar"
// se resuelve partiéndolo: se borra la fila `lugarId: null` y se recrea,
// con el mismo rango horario y motivo, una fila por cada OTRO lugar del
// médico que seguía bloqueado -- el lugar excluido queda libre, el resto
// sigue bloqueado exactamente como antes.
export async function dividirBloqueoExcluyendoLugar(
  bloqueo: { id: string; userId: string; inicio: Date; fin: Date; motivo: string | null },
  lugarIdExcluido: string
) {
  const otrosLugares = await prisma.lugarDeTrabajo.findMany({
    where: { userId: bloqueo.userId, deletedAt: null, id: { not: lugarIdExcluido } },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.bloqueoHorario.delete({ where: { id: bloqueo.id } }),
    ...(otrosLugares.length > 0
      ? [
          prisma.bloqueoHorario.createMany({
            data: otrosLugares.map((l) => ({
              userId: bloqueo.userId,
              lugarId: l.id,
              inicio: bloqueo.inicio,
              fin: bloqueo.fin,
              motivo: bloqueo.motivo,
            })),
          }),
        ]
      : []),
  ]);
}
