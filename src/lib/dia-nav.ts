import { diaSemanaFromDate, type DiaSemana } from "@/lib/slots";
import { formatDateParamBA } from "@/lib/timezone";

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

// "Anterior"/"Siguiente" saltan directo al próximo día que de hecho tiene
// horario cargado (el mismo criterio que deshabilita los días sin horario
// en el date-picker) -- si no, se podía terminar clickeando varias veces
// seguidas sobre días vacíos. Tope de 7 vueltas porque `diasConHorario` es
// un patrón semanal, nunca hace falta más -- salvo que la fecha puntual
// buscada esté en `diasEspeciales` (turnos movidos a un día sin horario
// configurado vía "Mover a un día libre", ver bloqueo-conflictos.ts), en
// cuyo caso igual se encuentra: se recorre día por día, nunca se salta la
// fecha exacta, solo los días intermedios que no matchean ninguno de los
// dos criterios.
export function nextDiaConHorario(
  date: Date,
  direction: 1 | -1,
  diasConHorario: DiaSemana[],
  diasEspeciales: string[] = []
): Date {
  let candidate = addDays(date, direction);
  if (diasConHorario.length === 0 && diasEspeciales.length === 0) return candidate;
  for (let i = 0; i < 7; i++) {
    if (
      diasConHorario.includes(diaSemanaFromDate(candidate)) ||
      diasEspeciales.includes(formatDateParamBA(candidate))
    ) {
      return candidate;
    }
    candidate = addDays(candidate, direction);
  }
  return candidate;
}
