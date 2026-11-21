import { describe, expect, it } from "vitest";
import { calcularImc, clasificacionImc, imcLegible } from "./nutricion";

describe("calcularImc", () => {
  it("acepta la estatura en metros o centímetros y texto con unidades", () => {
    expect(calcularImc("82,4 kg", "1,65")).toBe(30.3);
    expect(calcularImc("82.4", "165 cm")).toBe(30.3);
    expect(calcularImc("60", "1.70 m")).toBe(20.8);
  });

  it("sin datos o con valores imposibles, null", () => {
    expect(calcularImc("", "1,65")).toBeNull();
    expect(calcularImc("70", "")).toBeNull();
    expect(calcularImc("70", "16")).toBeNull();
  });
});

describe("clasificacionImc", () => {
  it("usa los cortes de la OMS para adultos", () => {
    expect(clasificacionImc(18.4)).toBe("Bajo peso");
    expect(clasificacionImc(24.9)).toBe("Peso normal");
    expect(clasificacionImc(25)).toBe("Sobrepeso");
    expect(clasificacionImc(30.3)).toBe("Obesidad grado I");
    expect(clasificacionImc(40)).toBe("Obesidad grado III");
  });
});

describe("imcLegible", () => {
  it("clasifica en adultos y no en menores", () => {
    expect(imcLegible("82,4", "1,65", false)).toBe("30,3 (Obesidad grado I)");
    expect(imcLegible("30", "1,30", true)).toBe("17,8");
    expect(imcLegible("", "", false)).toBe("");
  });
});
