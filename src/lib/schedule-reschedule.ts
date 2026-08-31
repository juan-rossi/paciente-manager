import { generarSlots, type WorkScheduleBlockLike } from "@/lib/slots";

export type TurnoParaReprogramar = {
  id: string;
  nombreYApellido: string;
  inicio: Date;
};

export type ReprogramacionItem = {
  turnoId: string;
  nombreYApellido: string;
  oldInicio: Date;
  newInicio: Date;
  newFin: Date;
};

const HORIZONTE_DIAS = 120;

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/**
 * Reasigna cada turno, en orden cronológico, al próximo slot libre según la nueva duración —
 * nunca antes de su horario actual, solo igual o más tarde. Si el día en curso ya no tiene
 * lugar, sigue buscando en los días siguientes que tengan bloque configurado. Esto sirve tanto
 * para achicar la duración (los turnos se adelantan lo mínimo posible dentro del mismo día) como
 * para agrandarla (los turnos se atrasan, pudiendo pasar a otro día).
 */
export function planReschedule(
  turnos: TurnoParaReprogramar[],
  blocks: WorkScheduleBlockLike[],
  newDurationMinutes: number
): { plan: ReprogramacionItem[]; sinSolucion: TurnoParaReprogramar[] } {
  const ordenados = [...turnos].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const usedSlots = new Set<number>();
  const plan: ReprogramacionItem[] = [];
  const sinSolucion: TurnoParaReprogramar[] = [];

  for (const turno of ordenados) {
    let day = new Date(turno.inicio);
    day.setHours(0, 0, 0, 0);
    let minInicio = turno.inicio.getTime();
    let asignado = false;

    for (let i = 0; i <= HORIZONTE_DIAS && !asignado; i++) {
      const slots = generarSlots(day, blocks, newDurationMinutes);
      const candidato = slots.find(
        (s) => s.inicio.getTime() >= minInicio && !usedSlots.has(s.inicio.getTime())
      );

      if (candidato) {
        usedSlots.add(candidato.inicio.getTime());
        if (candidato.inicio.getTime() !== turno.inicio.getTime()) {
          plan.push({
            turnoId: turno.id,
            nombreYApellido: turno.nombreYApellido,
            oldInicio: turno.inicio,
            newInicio: candidato.inicio,
            newFin: candidato.fin,
          });
        }
        asignado = true;
      } else {
        day = addDays(day, 1);
        minInicio = day.getTime();
      }
    }

    if (!asignado) {
      sinSolucion.push(turno);
    }
  }

  return { plan, sinSolucion };
}
