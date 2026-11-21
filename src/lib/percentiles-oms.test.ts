import { describe, expect, it } from "vitest";
import {
  formatPercentil,
  lmsPara,
  percentilOms,
  puntajeZ,
  puntajeZOms,
  valorReferencia,
  Z_INVEROSIMIL,
} from "./percentiles-oms";

// Valores de control tomados de las tablas publicadas por la OMS (2006).
describe("percentiles OMS", () => {
  it("la mediana es el percentil 50", () => {
    // Varón al nacer: mediana de peso 3,3464 kg.
    expect(percentilOms("peso", "MASCULINO", "2026-01-01", "2026-01-01", 3.3464)).toBeCloseTo(50, 1);
    // Nena al año (365 días ≈ 12 meses): mediana de longitud ~74,0 cm.
    const p = percentilOms("talla", "FEMENINO", "2025-01-01", "2026-01-01", 74.0);
    expect(p).toBeGreaterThan(45);
    expect(p).toBeLessThan(55);
  });

  it("+2 DE da el percentil 97,7", () => {
    const lms = lmsPara("perimetroCefalico", "MASCULINO", 0)!;
    const dosDE = valorReferencia("perimetroCefalico", "MASCULINO", "2026-01-01", "2026-01-01", 2)!;
    expect(puntajeZ(dosDE, lms)).toBeCloseTo(2, 5);
    expect(percentilOms("perimetroCefalico", "MASCULINO", "2026-01-01", "2026-01-01", dosDE)).toBeCloseTo(97.7, 1);
  });

  it("varón de 6 meses con 7,9 kg está cerca de la mediana (OMS: 7,9 kg)", () => {
    const p = percentilOms("peso", "MASCULINO", "2025-07-01", "2026-01-01", 7.9)!;
    expect(p).toBeGreaterThan(40);
    expect(p).toBeLessThan(60);
  });

  it("sin sexo, sin fecha o fuera de 0-5 años no hay percentil", () => {
    expect(percentilOms("peso", "", "2026-01-01", "2026-01-01", 3.3)).toBeNull();
    expect(percentilOms("peso", "MASCULINO", null, "2026-01-01", 3.3)).toBeNull();
    expect(percentilOms("peso", "MASCULINO", "2015-01-01", "2026-01-01", 30)).toBeNull();
  });

  it("una talla de 21 cm a los 4 años es inverosímil; una normal, no", () => {
    const z = puntajeZOms("talla", "MASCULINO", "2022-01-01", "2026-01-01", 21)!;
    expect(Math.abs(z)).toBeGreaterThan(Z_INVEROSIMIL);
    const normal = puntajeZOms("talla", "MASCULINO", "2022-01-01", "2026-01-01", 103)!;
    expect(Math.abs(normal)).toBeLessThan(1);
  });

  it("formatea los extremos", () => {
    expect(formatPercentil(50.4)).toBe("P50");
    expect(formatPercentil(0.3)).toBe("<P1");
    expect(formatPercentil(99.6)).toBe(">P99");
  });
});
