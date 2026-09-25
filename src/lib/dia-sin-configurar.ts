import { prisma } from "@/lib/prisma";
import { DIA_SEMANA_VALUES, diaSemanaFromDate } from "@/lib/slots";
import { addDays } from "@/lib/dia-nav";

const HORIZONTE_DIAS = 400;

// Próximas `cantidad` fechas (arrancando en `desde`, inclusive) cuyo día de
// semana no tiene NINGÚN `WorkScheduleBlock` para `lugarId` (`lugarId:
// null` = ningún lugar del médico atiende ese día de semana) -- usada por
// la resolución "Mover a un día libre" de un conflicto de bloqueo, para
// dejarle elegir al usuario a cuál de esos días mover los turnos en vez de
// moverlos siempre al más cercano. Devuelve `[]` si el médico atiende los 7
// días (no hay ningún día de semana sin horario).
export async function buscarProximosDiasLibres(
  userId: string,
  lugarId: string | null,
  desde: Date,
  cantidad = 10
): Promise<Date[]> {
  const blocks = await prisma.workScheduleBlock.findMany({
    where: { userId, ...(lugarId ? { lugarId } : {}) },
    select: { diaSemana: true },
  });
  const diasConHorario = new Set(blocks.map((b) => b.diaSemana));
  const diasLibres = DIA_SEMANA_VALUES.filter((d) => !diasConHorario.has(d));
  if (diasLibres.length === 0) return [];

  // Un día sin `WorkScheduleBlock` puede de todos modos tener un
  // `BloqueoHorario` ya existente encima (ej. un "Día completo" bloqueado
  // por otro motivo, sin relación con este conflicto) -- ofrecerlo igual
  // como "día libre" terminaría creando una `HorarioExcepcional` que ese
  // bloqueo tapa por completo: el turno se mueve bien, pero el resto del
  // bloque queda "abierto" en el papel y bloqueado en la práctica. Se traen
  // de una sola vez todos los bloqueos vigentes que aplican a este lugar
  // (los suyos propios, o un "Día completo" con `lugarId: null`) dentro del
  // horizonte de búsqueda, para no consultar uno por candidato.
  const horizonteFin = addDays(desde, HORIZONTE_DIAS);
  const bloqueos = await prisma.bloqueoHorario.findMany({
    where: {
      userId,
      inicio: { lt: horizonteFin },
      fin: { gt: desde },
      ...(lugarId ? { OR: [{ lugarId }, { lugarId: null }] } : {}),
    },
    select: { inicio: true, fin: true },
  });

  const resultado: Date[] = [];
  for (let i = 0; i < HORIZONTE_DIAS && resultado.length < cantidad; i++) {
    const candidato = addDays(desde, i);
    if (!diasLibres.includes(diaSemanaFromDate(candidato))) continue;
    const candidatoFin = addDays(candidato, 1);
    const bloqueado = bloqueos.some((b) => b.inicio < candidatoFin && b.fin > candidato);
    if (!bloqueado) resultado.push(candidato);
  }
  return resultado;
}
