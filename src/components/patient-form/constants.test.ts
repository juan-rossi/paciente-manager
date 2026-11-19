import { describe, expect, it } from "vitest";
import {
  ANTECEDENTE_LABELS,
  alertasOdontologicas,
  antecedentesPara,
  etiquetasHistoriaClinica,
} from "./constants";
import { TIPO_ANTECEDENTE_VALUES } from "@/lib/patient-schema";

describe("antecedentesPara", () => {
  it("cada grupo tiene su checklist", () => {
    expect(antecedentesPara("MEDICA").orden.map((a) => a.tipo)).toContain("PROSTATA");
    expect(antecedentesPara("PSICOLOGIA").orden.map((a) => a.tipo)).toContain("AUTOLESIONES");
    const odonto = antecedentesPara("ODONTOLOGICA").orden.map((a) => a.tipo);
    expect(odonto).toContain("ANTICOAGULANTES");
    expect(odonto).not.toContain("PROSTATA");
  });

  it("no repite tipos dentro de un grupo y todos son valores válidos", () => {
    for (const grupo of ["MEDICA", "PSICOLOGIA", "ODONTOLOGICA"] as const) {
      const tipos = antecedentesPara(grupo).orden.map((a) => a.tipo);
      expect(new Set(tipos).size).toBe(tipos.length);
      for (const tipo of tipos) expect(TIPO_ANTECEDENTE_VALUES).toContain(tipo);
    }
  });

  it("todos los antecedentes tienen etiqueta", () => {
    for (const tipo of TIPO_ANTECEDENTE_VALUES) expect(ANTECEDENTE_LABELS.has(tipo)).toBe(true);
  });
});

describe("etiquetasHistoriaClinica", () => {
  it("odontología llama plan de tratamiento al tratamiento", () => {
    expect(etiquetasHistoriaClinica("ODONTOLOGICA").tratamiento).toBe("Plan de tratamiento");
    expect(etiquetasHistoriaClinica("MEDICA").tratamiento).toBe("Tratamiento");
  });
});

describe("alertasOdontologicas", () => {
  it("solo avisa los críticos marcados en SI, con el detalle cargado", () => {
    expect(
      alertasOdontologicas([
        { tipo: "ANTICOAGULANTES", respuesta: true, medicacion: "acenocumarol 4 mg" },
        { tipo: "ALERGIA_ANESTESICOS", respuesta: true },
        { tipo: "BIFOSFONATOS", respuesta: false, medicacion: "alendronato" },
        { tipo: "DIABETES", respuesta: true },
      ])
    ).toEqual(["Alergia a anestésicos locales", "Anticoagulado (acenocumarol 4 mg)"]);
  });

  it("sin antecedentes no hay alertas", () => {
    expect(alertasOdontologicas([])).toEqual([]);
  });
});
