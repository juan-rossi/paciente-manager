import { describe, expect, it } from "vitest";
import { especialidadesParaTitulo, grupoEspecialidad, usaExamenFisico } from "./especialidad";

describe("grupoEspecialidad", () => {
  it("pediatría y sus subespecialidades médicas van al grupo pediátrico", () => {
    expect(grupoEspecialidad("PEDIATRIA")).toBe("PEDIATRICA");
    expect(grupoEspecialidad("CARDIOLOGIA_INFANTIL")).toBe("PEDIATRICA");
    expect(grupoEspecialidad("PSIQUIATRIA_INFANTIL_Y_ADOLESCENTE")).toBe("MEDICA");
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
});

describe("especialidadesParaTitulo", () => {
  it("un médico puede elegir pediatría; un odontólogo no", () => {
    expect(especialidadesParaTitulo("DR").map((o) => o.value)).toContain("PEDIATRIA");
    expect(especialidadesParaTitulo("").map((o) => o.value)).toContain("NEUROLOGIA_INFANTIL");
    expect(especialidadesParaTitulo("OD").map((o) => o.value)).not.toContain("PEDIATRIA");
    expect(especialidadesParaTitulo("DRA").map((o) => o.value)).toContain("OBSTETRICIA");
    expect(especialidadesParaTitulo("PSIC").map((o) => o.value)).not.toContain("GINECOLOGIA");
  });
});
