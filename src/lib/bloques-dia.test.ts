import { describe, expect, it } from "vitest";
import {
  agruparPorLugar,
  asignarSobreturnosATramos,
  bloquesDelDia,
  partirEnBloquesContiguos,
  type SlotLike,
} from "@/lib/bloques-dia";
import { puedeCancelarOnline } from "@/lib/turno-cancelacion-reglas";

const slot = (desde: string, hasta: string, lugarId = "a"): SlotLike => ({
  inicio: `2026-10-12T${desde}:00.000Z`,
  fin: `2026-10-12T${hasta}:00.000Z`,
  lugarId,
});

describe("partirEnBloquesContiguos", () => {
  it("corta donde hay un hueco entre slots", () => {
    const tramos = partirEnBloquesContiguos([
      slot("12:00", "12:30"),
      slot("12:30", "13:00"),
      slot("16:00", "16:30"),
    ]);
    expect(tramos.map((t) => t.length)).toEqual([2, 1]);
  });
});

describe("agruparPorLugar", () => {
  it("respeta el orden de primera aparición de cada lugar", () => {
    const grupos = agruparPorLugar(
      [slot("12:00", "12:30", "b"), slot("13:00", "13:30", "a"), slot("14:00", "14:30", "b")],
      [slot("15:00", "15:30", "c")]
    );
    expect(grupos.map((g) => g.lugarId)).toEqual(["b", "a", "c"]);
    expect(grupos[0].slots).toHaveLength(2);
    expect(grupos[2].sobreturnos).toHaveLength(1);
  });
});

describe("asignarSobreturnosATramos", () => {
  const tramos = [
    { inicio: slot("12:00", "13:00").inicio, fin: slot("12:00", "13:00").fin },
    { inicio: slot("16:00", "17:00").inicio, fin: slot("16:00", "17:00").fin },
  ];

  it("asigna al tramo que solapa", () => {
    expect(asignarSobreturnosATramos(tramos, [slot("16:15", "16:30")]).map((t) => t.length)).toEqual([0, 1]);
  });

  it("un sobreturno al final de la lista va al tramo anterior más cercano", () => {
    const porTramo = asignarSobreturnosATramos(tramos, [slot("13:00", "13:15"), slot("13:15", "13:30")]);
    expect(porTramo.map((t) => t.length)).toEqual([2, 0]);
  });

  it("sin tramos no asigna nada", () => {
    expect(asignarSobreturnosATramos([], [slot("13:00", "13:15")])).toEqual([]);
  });
});

describe("bloquesDelDia", () => {
  it("arma un bloque por tramo contiguo de cada lugar", () => {
    const grupos = agruparPorLugar(
      [slot("12:00", "12:30"), slot("12:30", "13:00"), slot("16:00", "16:30"), slot("19:00", "19:30", "b")],
      [slot("13:00", "13:15")]
    );
    const bloques = bloquesDelDia(grupos);
    expect(bloques.map((b) => [b.lugarId, b.inicio.slice(11, 16), b.fin.slice(11, 16)])).toEqual([
      ["a", "12:00", "13:00"],
      ["a", "16:00", "16:30"],
      ["b", "19:00", "19:30"],
    ]);
    expect(bloques[0].sobreturnos).toHaveLength(1);
    expect(new Set(bloques.map((b) => b.key)).size).toBe(3);
  });
});

describe("puedeCancelarOnline", () => {
  const inicio = new Date("2026-10-12T15:00:00Z");
  it("exige al menos 60 minutos de antelación", () => {
    expect(puedeCancelarOnline(inicio, new Date("2026-10-12T14:00:00Z"))).toBe(true);
    expect(puedeCancelarOnline(inicio, new Date("2026-10-12T14:00:01Z"))).toBe(false);
  });
});
