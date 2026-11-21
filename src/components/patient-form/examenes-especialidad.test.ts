import { describe, expect, it } from "vitest";
import { datosExamen, examenEspecialidad, EXAMENES_ESPECIALIDAD } from "./examenes-especialidad";
import { emptyPatientFormValues } from "./utils";

const TEXT_FIELDS_PARA_TEST = Object.keys(emptyPatientFormValues());

describe("examenEspecialidad", () => {
  it("oftalmología, ORL y dermatología tienen su examen; el resto no", () => {
    expect(examenEspecialidad("OFTALMOLOGICA")?.titulo).toBe("Examen oftalmológico");
    expect(examenEspecialidad("ORL")?.titulo).toBe("Examen otorrinolaringológico");
    expect(examenEspecialidad("DERMATOLOGICA")?.titulo).toBe("Examen dermatológico");
    expect(examenEspecialidad("MEDICA")).toBeNull();
  });

  it("todos los campos de los exámenes se guardan con el formulario", () => {
    for (const examen of EXAMENES_ESPECIALIDAD) {
      for (const s of examen.secciones) {
        for (const f of s.bilaterales ?? []) {
          expect(TEXT_FIELDS_PARA_TEST).toContain(f.derecho);
          expect(TEXT_FIELDS_PARA_TEST).toContain(f.izquierdo);
        }
        for (const c of s.campos ?? []) expect(TEXT_FIELDS_PARA_TEST).toContain(c.campo);
      }
    }
  });
});

describe("datosExamen", () => {
  it("arma las filas bilaterales como OD/OI y omite lo vacío", () => {
    const examen = examenEspecialidad("OFTALMOLOGICA")!;
    expect(
      datosExamen(examen, { ofPioOd: "16", ofPioOi: "18", ofAvScOd: "5/10", ofAvScOi: "", ofPupilas: "Isocóricas" })
    ).toEqual([
      { label: "AV sin corrección", value: "OD: 5/10" },
      { label: "Presión intraocular", value: "OD: 16 · OI: 18" },
      { label: "Pupilas", value: "Isocóricas" },
    ]);
  });
});
