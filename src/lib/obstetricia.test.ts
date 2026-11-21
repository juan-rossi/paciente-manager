import { describe, expect, it } from "vitest";
import { edadGestacional, formatEdadGestacional, formulaObstetrica } from "./obstetricia";

const HOY = { year: 2026, month: 11, day: 21 };

describe("edadGestacional", () => {
  it("calcula semanas, días y FPP (FUM + 280 días)", () => {
    expect(edadGestacional("2026-06-01", HOY)).toEqual({ semanas: 24, dias: 5, fpp: "2027-03-08" });
    expect(edadGestacional("2026-11-21", HOY)).toEqual({ semanas: 0, dias: 0, fpp: "2027-08-28" });
  });

  it("descarta FUM inválidas, futuras o de más de 44 semanas", () => {
    expect(edadGestacional("", HOY)).toBeNull();
    expect(edadGestacional(null, HOY)).toBeNull();
    expect(edadGestacional("2026-13-01", HOY)).toBeNull();
    expect(edadGestacional("2026-12-01", HOY)).toBeNull();
    expect(edadGestacional("2025-12-01", HOY)).toBeNull();
  });

  it("se lee en semanas y días", () => {
    expect(formatEdadGestacional({ semanas: 25, dias: 5 })).toBe("25 semanas y 5 días");
    expect(formatEdadGestacional({ semanas: 12, dias: 0 })).toBe("12 semanas");
  });
});

describe("formulaObstetrica", () => {
  it("arma G P C A con guiones para lo que falta", () => {
    expect(formulaObstetrica({ gestas: "2", partos: "1", cesareas: "1", abortos: "0" })).toBe("G2 P1 C1 A0");
    expect(formulaObstetrica({ gestas: "3", partos: "", cesareas: null })).toBe("G3 P- C- A-");
    expect(formulaObstetrica({})).toBe("");
  });
});
