import { describe, expect, it } from "vitest";
import { destinoInterno } from "./redirect-seguro";

const ORIGEN = "https://semio360.com";

describe("destinoInterno", () => {
  it("acepta rutas internas con query y hash", () => {
    expect(destinoInterno("/turnos", ORIGEN)).toBe("/turnos");
    expect(destinoInterno("/patients/abc?tab=hc#evoluciones", ORIGEN)).toBe("/patients/abc?tab=hc#evoluciones");
  });

  it("rechaza destinos en otro sitio", () => {
    for (const from of [
      "/\\evil.com",
      "/\\/evil.com",
      "//evil.com",
      "///evil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "/\tevil.com",
      " /turnos",
      "evil.com",
    ]) {
      expect(destinoInterno(from, ORIGEN), from).toBeNull();
    }
  });

  it("vacío o ausente", () => {
    expect(destinoInterno(null, ORIGEN)).toBeNull();
    expect(destinoInterno("", ORIGEN)).toBeNull();
  });
});
