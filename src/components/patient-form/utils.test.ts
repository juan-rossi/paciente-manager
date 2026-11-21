import { describe, expect, it } from "vitest";
import { edadLegible } from "./utils";

const HOY = { year: 2026, month: 11, day: 21 };

describe("edadLegible", () => {
  it("en días el primer mes", () => {
    expect(edadLegible("2026-11-21", HOY)).toBe("Recién nacido");
    expect(edadLegible("2026-11-20", HOY)).toBe("1 día");
    expect(edadLegible("2026-10-25", HOY)).toBe("27 días");
  });

  it("en meses el primer año", () => {
    expect(edadLegible("2026-10-21", HOY)).toBe("1 mes");
    expect(edadLegible("2026-03-22", HOY)).toBe("7 meses");
  });

  it("en años y meses hasta los 3", () => {
    expect(edadLegible("2025-11-21", HOY)).toBe("1 año");
    expect(edadLegible("2025-08-10", HOY)).toBe("1 año y 3 meses");
    expect(edadLegible("2024-01-01", HOY)).toBe("2 años y 10 meses");
  });

  it("en años de ahí en adelante", () => {
    expect(edadLegible("2023-05-01", HOY)).toBe("3 años");
    expect(edadLegible("1980-12-01", HOY)).toBe("45 años");
  });

  it("sin fecha o con fecha futura, vacío", () => {
    expect(edadLegible("", HOY)).toBe("");
    expect(edadLegible("2027-01-01", HOY)).toBe("");
  });
});
