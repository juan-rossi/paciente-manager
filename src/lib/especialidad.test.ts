import { describe, expect, it } from "vitest";
import { especialidadesParaTitulo, grupoEspecialidad, limitesDictado, usaExamenFisico } from "./especialidad";

describe("grupoEspecialidad", () => {
  it("pediatría y sus subespecialidades médicas van al grupo pediátrico", () => {
    expect(grupoEspecialidad("PEDIATRIA")).toBe("PEDIATRICA");
    expect(grupoEspecialidad("CARDIOLOGIA_INFANTIL")).toBe("PEDIATRICA");
    expect(grupoEspecialidad("PSIQUIATRIA_INFANTIL_Y_ADOLESCENTE")).toBe("PSIQUIATRICA");
    expect(grupoEspecialidad("ODONTOPEDIATRIA")).toBe("ODONTOLOGICA");
    expect(grupoEspecialidad(null)).toBe("MEDICA");
  });

  it("ginecología, obstetricia, mastología y fertilidad van a salud de la mujer", () => {
    expect(grupoEspecialidad("GINECOLOGIA")).toBe("GINECOLOGICA");
    expect(grupoEspecialidad("OBSTETRICIA")).toBe("GINECOLOGICA");
    expect(grupoEspecialidad("MASTOLOGIA")).toBe("GINECOLOGICA");
    expect(grupoEspecialidad("MEDICINA_REPRODUCTIVA_FERTILIDAD")).toBe("GINECOLOGICA");
    expect(usaExamenFisico("GINECOLOGIA")).toBe(true);
  });

  it("los pediatras usan examen físico", () => {
    expect(usaExamenFisico("PEDIATRIA")).toBe(true);
  });

  it("psiquiatría es su propio grupo, con examen psíquico en vez de físico", () => {
    expect(grupoEspecialidad("PSIQUIATRIA")).toBe("PSIQUIATRICA");
    expect(usaExamenFisico("PSIQUIATRIA")).toBe(false);
    expect(usaExamenFisico("PSIQUIATRIA_INFANTIL_Y_ADOLESCENTE")).toBe(false);
  });

  it("nutrición es su propio grupo, con evaluación nutricional en vez de examen físico", () => {
    expect(grupoEspecialidad("NUTRICION")).toBe("NUTRICION");
    expect(usaExamenFisico("NUTRICION")).toBe(false);
    expect(especialidadesParaTitulo("LIC").map((o) => o.value)).toContain("NUTRICION");
    expect(especialidadesParaTitulo("DR").map((o) => o.value)).toContain("NUTRICION");
  });

  it("psicólogos y psiquiatras dictan hasta una hora; el resto, 10 minutos", () => {
    expect(limitesDictado("PSICOLOGIA").maxGrabacionSegundos).toBe(60 * 60);
    expect(limitesDictado("PSIQUIATRIA").maxGrabacionSegundos).toBe(60 * 60);
    expect(limitesDictado("PSIQUIATRIA_INFANTIL_Y_ADOLESCENTE").maxGrabacionSegundos).toBe(60 * 60);
    expect(limitesDictado("CLINICA_MEDICA").maxGrabacionSegundos).toBe(10 * 60);
  });
});

describe("especialidadesParaTitulo", () => {
  it("un médico puede elegir pediatría; un odontólogo no", () => {
    expect(especialidadesParaTitulo("DR").map((o) => o.value)).toContain("PEDIATRIA");
    expect(especialidadesParaTitulo("").map((o) => o.value)).toContain("NEUROLOGIA_INFANTIL");
    expect(especialidadesParaTitulo("OD").map((o) => o.value)).not.toContain("PEDIATRIA");
    expect(especialidadesParaTitulo("DRA").map((o) => o.value)).toContain("OBSTETRICIA");
    expect(especialidadesParaTitulo("PSIC").map((o) => o.value)).not.toContain("GINECOLOGIA");
    expect(especialidadesParaTitulo("DR").map((o) => o.value)).toContain("PSIQUIATRIA");
    expect(especialidadesParaTitulo("PSIC").map((o) => o.value)).not.toContain("PSIQUIATRIA");
  });
});
