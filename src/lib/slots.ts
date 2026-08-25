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
  return DIAS_POR_INDICE[date.getDay()];
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

    const cursor = new Date(date);
    cursor.setHours(inicioHora.h, inicioHora.m, 0, 0);

    const finBlock = new Date(date);
    finBlock.setHours(finHora.h, finHora.m, 0, 0);

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
