import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calcularUpgradePremium,
  diasParaFecha,
  diasRestantesDePagoUnico,
  diasRestantesDeTrial,
  esActivo,
  fechaVencimientoRelevante,
  precioTotalDuracion,
  trialActivo,
} from "@/lib/plan";

const AHORA = new Date("2026-10-10T15:00:00Z");
const enDias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AHORA);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("trial", () => {
  it("trialActivo y diasRestantesDeTrial", () => {
    const user = { plan: "BASICA" as const, trialEndsAt: enDias(3.5) };
    expect(trialActivo(user)).toBe(true);
    expect(diasRestantesDeTrial(user)).toBe(4);
  });

  it("un trial vencido da 0 días, nunca negativo", () => {
    const user = { plan: "BASICA" as const, trialEndsAt: enDias(-10) };
    expect(trialActivo(user)).toBe(false);
    expect(diasRestantesDeTrial(user)).toBe(0);
  });

  it("sin trial", () => {
    expect(diasRestantesDeTrial({ plan: "PREMIUM", trialEndsAt: null })).toBeNull();
  });
});

describe("diasRestantesDePagoUnico", () => {
  it("aplica solo a pagos únicos de 6 meses o más", () => {
    expect(diasRestantesDePagoUnico({ planDuracion: "SEMESTRAL", planEndsAt: enDias(10) })).toBe(10);
    expect(diasRestantesDePagoUnico({ planDuracion: "MENSUAL", planEndsAt: enDias(10) })).toBeNull();
    expect(diasRestantesDePagoUnico({ planDuracion: "ANUAL", planEndsAt: null })).toBeNull();
  });
});

describe("precioTotalDuracion", () => {
  it("multiplica el precio mensual con descuento por los meses", () => {
    expect(precioTotalDuracion("BASICA", "MENSUAL")).toBe(40000);
    expect(precioTotalDuracion("BASICA", "SEMESTRAL")).toBe(38000 * 6);
    expect(precioTotalDuracion("PREMIUM", "BIANUAL")).toBe(60000 * 24);
  });
});

describe("calcularUpgradePremium", () => {
  it("cobra solo la diferencia por el tiempo que queda", () => {
    const calculo = calcularUpgradePremium({ planDuracion: "SEMESTRAL", planEndsAt: enDias(61) }, AHORA)!;
    expect(calculo.diasRestantes).toBe(61);
    expect(calculo.aPagar).toBe(calculo.totalPremium - calculo.creditoBasico);
    // (71250 - 38000) por ~2 meses.
    expect(calculo.aPagar).toBeGreaterThan(66000);
    expect(calculo.aPagar).toBeLessThan(67000);
  });

  it("no aplica a la suscripción mensual, sin fecha o ya vencido", () => {
    expect(calcularUpgradePremium({ planDuracion: "MENSUAL", planEndsAt: enDias(20) }, AHORA)).toBeNull();
    expect(calcularUpgradePremium({ planDuracion: "ANUAL", planEndsAt: null }, AHORA)).toBeNull();
    expect(calcularUpgradePremium({ planDuracion: "ANUAL", planEndsAt: enDias(-1) }, AHORA)).toBeNull();
  });
});

describe("estado de cuenta", () => {
  it("esActivo con trial o plan vigente", () => {
    expect(esActivo({ trialEndsAt: enDias(1), planEndsAt: null })).toBe(true);
    expect(esActivo({ trialEndsAt: enDias(-1), planEndsAt: enDias(1) })).toBe(true);
    expect(esActivo({ trialEndsAt: enDias(-1), planEndsAt: enDias(-1) })).toBe(false);
  });

  it("fechaVencimientoRelevante prioriza el plan pago sobre el trial", () => {
    expect(fechaVencimientoRelevante({ trialEndsAt: enDias(5), planEndsAt: enDias(90) })).toEqual(enDias(90));
    expect(fechaVencimientoRelevante({ trialEndsAt: enDias(5), planEndsAt: null })).toEqual(enDias(5));
  });

  it("diasParaFecha", () => {
    expect(diasParaFecha(enDias(2.1), AHORA)).toBe(3);
    expect(diasParaFecha(null, AHORA)).toBeNull();
  });
});
