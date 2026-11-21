import { describe, expect, it } from "vitest";
import { grupoEspecialidad, type Especialidad } from "./especialidad";
import { REGLA_RESUMEN, VOCABULARIO_DICTADO } from "./ia-especialidad";

describe("ajustes de IA por especialidad", () => {
  it("solo hay ajustes para especialidades del grupo médico (las demás usan los de su grupo)", () => {
    const especialidades = [...Object.keys(VOCABULARIO_DICTADO), ...Object.keys(REGLA_RESUMEN)] as Especialidad[];
    for (const e of especialidades) expect(grupoEspecialidad(e), e).toBe("MEDICA");
  });

  it("el vocabulario del dictado entra en el prompt de Whisper (unos 220 tokens)", () => {
    for (const [e, texto] of Object.entries(VOCABULARIO_DICTADO)) expect(texto.length, e).toBeLessThan(1000);
  });
});
