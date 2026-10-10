import { describe, expect, it } from "vitest";
import { diaSemanaFromDate, generarSlots, type WorkScheduleBlockLike } from "@/lib/slots";
import { dateParamToDateBA, formatHoraBA } from "@/lib/timezone";

// 2026-10-12 es lunes.
const lunes = dateParamToDateBA("2026-10-12")!;
const horas = (slots: { inicio: Date }[]) => slots.map((s) => formatHoraBA(s.inicio));

describe("diaSemanaFromDate", () => {
  it("usa el día de BA", () => {
    expect(diaSemanaFromDate(lunes)).toBe("LUNES");
    // Domingo 11/10 a las 23:00 en BA, ya lunes en UTC.
    expect(diaSemanaFromDate(new Date("2026-10-12T02:00:00Z"))).toBe("DOMINGO");
  });
});

describe("generarSlots", () => {
  const blocks: WorkScheduleBlockLike[] = [
    { diaSemana: "LUNES", horaInicio: "14:00", horaFin: "15:00", lugarId: "b" },
    { diaSemana: "LUNES", horaInicio: "09:00", horaFin: "10:00", lugarId: "a" },
    { diaSemana: "MARTES", horaInicio: "09:00", horaFin: "18:00", lugarId: "a" },
  ];

  it("solo usa los bloques del día y los ordena cronológicamente", () => {
    const slots = generarSlots(lunes, blocks, 30);
    expect(horas(slots)).toEqual(["09:00", "09:30", "14:00", "14:30"]);
    expect(slots.map((s) => s.lugarId)).toEqual(["a", "a", "b", "b"]);
  });

  it("descarta el último tramo si no entra un turno completo", () => {
    const slots = generarSlots(lunes, [{ diaSemana: "LUNES", horaInicio: "09:00", horaFin: "10:00", lugarId: "a" }], 25);
    expect(horas(slots)).toEqual(["09:00", "09:25"]);
    expect(slots[1].fin.getTime() - slots[1].inicio.getTime()).toBe(25 * 60_000);
  });

  it("devuelve vacío un día sin horario", () => {
    expect(generarSlots(dateParamToDateBA("2026-10-11")!, blocks, 30)).toEqual([]);
  });

  it("suma las aperturas puntuales aunque no haya bloque semanal ese día", () => {
    const domingo = dateParamToDateBA("2026-10-11")!;
    const slots = generarSlots(domingo, blocks, 30, [
      { inicio: new Date("2026-10-11T13:00:00Z"), fin: new Date("2026-10-11T14:00:00Z"), lugarId: "c" },
    ]);
    expect(horas(slots)).toEqual(["10:00", "10:30"]);
    expect(slots.every((s) => s.lugarId === "c")).toBe(true);
  });
});
