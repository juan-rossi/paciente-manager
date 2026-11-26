import { describe, expect, it } from "vitest";
import { teleconsultaEfectiva, validarConfigTeleconsulta } from "./teleconsulta-config";

const todo = {
  teleconsultaHabilitada: true,
  teleconsultaPasarPresenciales: true,
  teleconsultaLugarVirtual: true,
};

describe("teleconsultaEfectiva", () => {
  it("con la plataforma apagada no habilita nada, aunque el médico la tenga prendida", () => {
    expect(teleconsultaEfectiva(false, todo)).toEqual({
      habilitada: false,
      pasarPresenciales: false,
      lugarVirtual: false,
    });
  });

  it("el interruptor general del médico manda sobre las opciones", () => {
    expect(teleconsultaEfectiva(true, { ...todo, teleconsultaHabilitada: false })).toEqual({
      habilitada: false,
      pasarPresenciales: false,
      lugarVirtual: false,
    });
  });

  it("prendida, respeta cada opción", () => {
    expect(teleconsultaEfectiva(true, { ...todo, teleconsultaLugarVirtual: false })).toEqual({
      habilitada: true,
      pasarPresenciales: true,
      lugarVirtual: false,
    });
  });
});

describe("validarConfigTeleconsulta", () => {
  it("prendida sin ninguna opción es un error", () => {
    expect(
      validarConfigTeleconsulta(
        { ...todo, teleconsultaPasarPresenciales: false, teleconsultaLugarVirtual: false },
        false
      )
    ).toMatch(/al menos una/);
  });

  it("apagada sin opciones está bien", () => {
    expect(
      validarConfigTeleconsulta(
        { teleconsultaHabilitada: false, teleconsultaPasarPresenciales: false, teleconsultaLugarVirtual: false },
        false
      )
    ).toBeNull();
  });

  it("no deja apagar la teleconsulta ni el lugar mientras exista un lugar VIRTUAL", () => {
    expect(validarConfigTeleconsulta({ ...todo, teleconsultaHabilitada: false }, true)).toMatch(/Eliminalo/);
    expect(validarConfigTeleconsulta({ ...todo, teleconsultaLugarVirtual: false }, true)).toMatch(/Eliminalo/);
  });

  it("deja dejar de pasar presenciales aunque haya turnos ya pasados", () => {
    expect(validarConfigTeleconsulta({ ...todo, teleconsultaPasarPresenciales: false }, true)).toBeNull();
  });
});
