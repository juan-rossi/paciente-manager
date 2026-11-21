import { describe, expect, it } from "vitest";
import {
  CAMPOS_CONTROL,
  camposPara,
  compararControles,
  controlFromDb,
  controlInput,
  formatValor,
  indicadoresPara,
  parseValor,
} from "./controles";

const vacio = Object.fromEntries(CAMPOS_CONTROL.map((c) => [c, null]));

describe("indicadoresPara", () => {
  it("cada grupo sigue lo suyo", () => {
    expect(indicadoresPara("PEDIATRICA").map((i) => i.id)).toEqual(["peso", "talla", "perimetroCefalico"]);
    expect(camposPara("GINECOLOGICA")).toContain("alturaUterina");
    expect(camposPara("PSIQUIATRICA")).toContain("litemia");
    expect(camposPara("MEDICA")).toEqual(
      expect.arrayContaining(["peso", "presionSistolica", "presionDiastolica", "glucemia"])
    );
  });

  it("psicología, fonoaudiología y odontología no tienen controles", () => {
    expect(indicadoresPara("PSICOLOGIA")).toEqual([]);
    expect(indicadoresPara("FONOAUDIOLOGIA")).toEqual([]);
    expect(indicadoresPara("ODONTOLOGICA")).toEqual([]);
  });
});

describe("parseValor y formatValor", () => {
  it("acepta coma o punto; vacío es null y lo que no es número, NaN", () => {
    expect(parseValor("72,5")).toBe(72.5);
    expect(parseValor(" 120 ")).toBe(120);
    expect(parseValor("")).toBeNull();
    expect(parseValor("72 kg")).toBeNaN();
  });

  it("formatea con los decimales del campo", () => {
    expect(formatValor("peso", 72.5)).toBe("72,5");
    expect(formatValor("presionSistolica", 120)).toBe("120");
    expect(formatValor("litemia", 0.85)).toBe("0,85");
  });
});

describe("controlInput", () => {
  it("acepta un control con al menos un valor", () => {
    const r = controlInput.safeParse({ ...vacio, fecha: "2026-11-21", peso: 72.5, nota: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nota).toBeNull();
  });

  it("rechaza un control vacío o con valores fuera de rango", () => {
    expect(controlInput.safeParse({ ...vacio, fecha: "2026-11-21", nota: null }).success).toBe(false);
    const fuera = controlInput.safeParse({ ...vacio, fecha: "2026-11-21", peso: 7000, nota: null });
    expect(fuera.success).toBe(false);
    if (!fuera.success) expect(fuera.error.issues[0].message).toContain("Peso");
  });
});

describe("compararControles", () => {
  it("ordena por fecha y, el mismo día, por orden de carga", () => {
    const a = controlFromDb({ id: "a", fecha: "2026-11-21", createdAt: "2026-11-21T15:00:00Z" });
    const b = controlFromDb({ id: "b", fecha: "2026-11-21", createdAt: "2026-11-21T14:00:00Z" });
    const c = controlFromDb({ id: "c", fecha: "2026-11-20", createdAt: "2026-11-22T10:00:00Z" });
    expect([a, b, c].sort(compararControles).map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
});

describe("controlFromDb", () => {
  it("normaliza la fecha y los valores ausentes", () => {
    const c = controlFromDb({ id: "c1", fecha: new Date("2026-11-21T00:00:00Z"), peso: 70, nota: null });
    expect(c.fecha).toBe("2026-11-21");
    expect(c.peso).toBe(70);
    expect(c.talla).toBeNull();
  });
});
