import { describe, expect, it } from "vitest";
import { isPlatformAdmin } from "./admin-access";

describe("isPlatformAdmin", () => {
  it("la cuenta de plataforma es admin", () => {
    expect(isPlatformAdmin({ role: "ADMIN" })).toBe(true);
  });

  it("un médico con el flag es admin; sin el flag no", () => {
    expect(isPlatformAdmin({ role: "DOCTOR", isAdmin: true })).toBe(true);
    expect(isPlatformAdmin({ role: "DOCTOR", isAdmin: false })).toBe(false);
    expect(isPlatformAdmin({ role: "DOCTOR", isAdmin: null })).toBe(false);
  });

  it("un asistente nunca es admin, aunque tenga el flag en la base", () => {
    expect(isPlatformAdmin({ role: "SECRETARY", isAdmin: true })).toBe(false);
    expect(isPlatformAdmin({ role: "SECRETARY" })).toBe(false);
  });
});
