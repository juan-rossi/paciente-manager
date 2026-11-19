import { describe, expect, it } from "vitest";
import { diffAntecedentesAnterior } from "./audit-log";

const etiqueta = (tipo: string) => ({ HTA: "Hipertensión", DBT: "Diabetes" })[tipo] ?? tipo;

describe("diffAntecedentesAnterior", () => {
  it("sin cambios devuelve null (también si llegan campos sin cargar como undefined)", () => {
    const antes = [{ tipo: "HTA", respuesta: true, descripcion: null, fechaInicio: "2020", medicacion: null, resolucion: null }];
    const despues = [{ tipo: "HTA", respuesta: true, fechaInicio: "2020" }, { tipo: "DBT", respuesta: false }];
    expect(diffAntecedentesAnterior(antes, despues, etiqueta)).toBeNull();
  });

  it("registra el estado anterior de los que cambiaron", () => {
    const antes = [{ tipo: "HTA", respuesta: true, descripcion: null, fechaInicio: "2020", medicacion: "enalapril", resolucion: null }];
    const despues = [
      { tipo: "HTA", respuesta: true, fechaInicio: "2020", medicacion: "losartán" },
      { tipo: "DBT", respuesta: true },
    ];
    expect(diffAntecedentesAnterior(antes, despues, etiqueta)).toBe(
      "Hipertensión: Sí, desde 2020, medicación: enalapril\nDiabetes: sin cargar"
    );
  });

  it("desmarcar un antecedente también queda registrado", () => {
    const antes = [{ tipo: "HTA", respuesta: true, descripcion: null, fechaInicio: null, medicacion: null, resolucion: null }];
    expect(diffAntecedentesAnterior(antes, [{ tipo: "HTA", respuesta: false }], etiqueta)).toBe("Hipertensión: Sí");
  });
});
