import { describe, expect, it } from "vitest";
import { esFechaValida } from "./limites-texto";

describe("esFechaValida", () => {
  it("acepta fechas reales, con o sin hora", () => {
    expect(esFechaValida("2026-11-23")).toBe(true);
    expect(esFechaValida("2024-02-29")).toBe(true);
    expect(esFechaValida("2026-12-31")).toBe(true);
    expect(esFechaValida("2026-11-23T10:00:00-03:00")).toBe(true);
    expect(esFechaValida("2026-11-23T13:00:00.000Z")).toBe(true);
  });

  it("rechaza días que no existen en ese mes (en vez de correrlos)", () => {
    expect(esFechaValida("2025-02-30")).toBe(false);
    expect(esFechaValida("2025-02-29")).toBe(false);
    expect(esFechaValida("2026-04-31")).toBe(false);
    expect(esFechaValida("2026-11-31T10:00:00-03:00")).toBe(false);
  });

  it("rechaza meses/días fuera de rango y textos que no son fechas", () => {
    expect(esFechaValida("2026-13-01")).toBe(false);
    expect(esFechaValida("2026-00-10")).toBe(false);
    expect(esFechaValida("2026-11-00")).toBe(false);
    expect(esFechaValida("no-es-fecha")).toBe(false);
    expect(esFechaValida("23/11/2026")).toBe(false);
  });
});
