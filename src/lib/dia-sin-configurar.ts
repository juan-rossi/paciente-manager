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

  const resultado: Date[] = [];
  for (let i = 0; i < HORIZONTE_DIAS && resultado.length < cantidad; i++) {
    const candidato = addDays(desde, i);
    if (diasLibres.includes(diaSemanaFromDate(candidato))) resultado.push(candidato);
  }
  return resultado;
}
