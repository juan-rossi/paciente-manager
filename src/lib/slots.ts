import { getDayBA, setTimeBA } from "@/lib/timezone";

export const DIA_SEMANA_VALUES = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
] as const;

export type DiaSemana = (typeof DIA_SEMANA_VALUES)[number];

const DIAS_POR_INDICE: DiaSemana[] = [
  "DOMINGO",
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
];

export function diaSemanaFromDate(date: Date): DiaSemana {
  return DIAS_POR_INDICE[getDayBA(date)];
}

export type WorkScheduleBlockLike = {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  lugarId: string;
};

export type Slot = {
  inicio: Date;
  fin: Date;
  lugarId: string;
};

function parseHora(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return { h, m };
}

// Trocea un rango [inicio, fin) en slots consecutivos de `duracionMs`,
// para un `lugarId` -- lo comparte tanto un bloque semanal (`generarSlots`
// resuelve su hora de pared a un `Date` puntual antes de llamarla) como
// una `apertura` puntual (ya viene con `Date`s absolutos, sin pasar por
// `diaSemana`/hora de pared).
function trocearEnSlots(inicio: Date, fin: Date, lugarId: string, duracionMs: number): Slot[] {
  const slots: Slot[] = [];
  const cursor = new Date(inicio);
  while (cursor.getTime() + duracionMs <= fin.getTime()) {
    slots.push({
      inicio: new Date(cursor),
      fin: new Date(cursor.getTime() + duracionMs),
      lugarId,
    });
    cursor.setTime(cursor.getTime() + duracionMs);
  }
  return slots;
}

// Una fecha puntual habilitada para reservar aparte del patrón semanal --
// ver `HorarioExcepcional` en el schema ("Habilitar turnos nuevos ese
// día" al resolver un conflicto de "Bloquear horarios"). A diferencia de
// `WorkScheduleBlockLike`, ya trae `inicio`/`fin` absolutos: nunca se
// resuelve contra el día de semana de `date`.
export type AperturaLike = { inicio: Date; fin: Date; lugarId: string };

/**
 * Genera los slots consecutivos de `duracionMinutos` para los bloques del
 * día de la semana que corresponde a `date`, más los de `aperturas` (si
 * las hay) para esa fecha puntual.
 */
export function generarSlots(
  date: Date,
  blocks: WorkScheduleBlockLike[],
  duracionMinutos: number,
  aperturas: AperturaLike[] = []
): Slot[] {
  const dia = diaSemanaFromDate(date);
  const blocksDelDia = blocks.filter((b) => b.diaSemana === dia);
  const duracionMs = duracionMinutos * 60_000;
  const slots: Slot[] = [];

  for (const block of blocksDelDia) {
    const inicioHora = parseHora(block.horaInicio);
    const finHora = parseHora(block.horaFin);
    const cursor = setTimeBA(date, inicioHora.h, inicioHora.m);
    const finBlock = setTimeBA(date, finHora.h, finHora.m);
    slots.push(...trocearEnSlots(cursor, finBlock, block.lugarId, duracionMs));
  }

  for (const apertura of aperturas) {
    slots.push(...trocearEnSlots(apertura.inicio, apertura.fin, apertura.lugarId, duracionMs));
  }

  return slots.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}
