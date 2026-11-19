import { describe, expect, it } from "vitest";
import {
  arancelInputSchema,
  calcularTotal,
  describirUbicacion,
  presupuestoFromDb,
  presupuestoInputSchema,
} from "./presupuesto";

const item = { practicaId: "p1", pieza: "36", caras: ["O", "D"], monto: 45000 };

describe("presupuestoInputSchema", () => {
  it("acepta un presupuesto válido", () => {
    expect(presupuestoInputSchema.safeParse({ fecha: "2026-11-18", items: [item] }).success).toBe(true);
  });

  it("exige al menos una práctica", () => {
    const r = presupuestoInputSchema.safeParse({ fecha: "2026-11-18", items: [] });
    expect(r.success).toBe(false);
  });

  it("rechaza piezas inválidas, caras sin pieza y montos con centavos o negativos", () => {
    for (const malo of [
      { ...item, pieza: "99" },
      { ...item, pieza: null },
      { ...item, monto: 10.5 },
      { ...item, monto: -1 },
    ]) {
      expect(presupuestoInputSchema.safeParse({ fecha: "2026-11-18", items: [malo] }).success).toBe(false);
    }
  });

  it("acepta boca completa sin caras", () => {
    const r = presupuestoInputSchema.safeParse({
      fecha: "2026-11-18",
      items: [{ practicaId: "p1", pieza: null, caras: [], monto: 0 }],
    });
    expect(r.success).toBe(true);
  });
});

describe("arancelInputSchema", () => {
  it("monto null borra el arancel", () => {
    expect(arancelInputSchema.safeParse({ practicaId: "p1", monto: null }).success).toBe(true);
  });
});

describe("helpers", () => {
  it("calcularTotal suma los montos", () => {
    expect(calcularTotal([{ monto: 1000 }, { monto: 2500 }])).toBe(3500);
    expect(calcularTotal([])).toBe(0);
  });

  it("describirUbicacion", () => {
    expect(describirUbicacion({ pieza: "36", caras: ["O", "D"] })).toBe("36 · O D");
    expect(describirUbicacion({ pieza: "11", caras: [] })).toBe("11");
    expect(describirUbicacion({ pieza: null, caras: [] })).toBe("Boca completa");
  });

  it("presupuestoFromDb ordena los ítems y las caras", () => {
    const p = presupuestoFromDb({
      id: "x",
      fecha: new Date("2026-11-18T00:00:00.000Z"),
      estado: "PENDIENTE",
      nota: null,
      deletedAt: null,
      items: [
        { id: "b", practicaId: "p2", codigo: "02", descripcion: "B", pieza: "11", caras: ["D", "O"], monto: 2, orden: 1 },
        { id: "a", practicaId: "p1", codigo: "01", descripcion: "A", pieza: null, caras: [], monto: 1, orden: 0 },
      ],
    });
    expect(p.fecha).toBe("2026-11-18");
    expect(p.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(p.items[1].caras).toEqual(["O", "D"]);
  });
});
