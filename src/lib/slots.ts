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
};

export type Slot = {
  inicio: Date;
  fin: Date;
};

function parseHora(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return { h, m };
}

/** Genera los slots consecutivos de `duracionMinutos` para los bloques del día de la semana que corresponde a `date`. */
export function generarSlots(
  date: Date,
  blocks: WorkScheduleBlockLike[],
  duracionMinutos: number
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

    while (cursor.getTime() + duracionMs <= finBlock.getTime()) {
      slots.push({
        inicio: new Date(cursor),
        fin: new Date(cursor.getTime() + duracionMs),
      });
      cursor.setTime(cursor.getTime() + duracionMs);
    }
  }

  return slots.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}
