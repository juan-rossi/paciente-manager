import { describe, expect, it } from "vitest";
import { precioTotalDuracion } from "./plan";
import { inferirCompraPorMonto, leerCompra, metadataCompra, resolverPagoUnico } from "./mp-compra";

const AHORA = new Date("2026-11-19T12:00:00Z");
const enDias = (d: number) => new Date(AHORA.getTime() + d * 24 * 60 * 60 * 1000);

const BASICA_SEMESTRAL = precioTotalDuracion("BASICA", "SEMESTRAL");
const PREMIUM_BIANUAL = precioTotalDuracion("PREMIUM", "BIANUAL");

describe("metadataCompra / leerCompra", () => {
  it("ida y vuelta de una compra de plan", () => {
    const meta = metadataCompra({ tipo: "plan", plan: "PREMIUM", duracion: "ANUAL", monto: 476328 });
    expect(leerCompra(meta)).toEqual({ tipo: "plan", plan: "PREMIUM", duracion: "ANUAL", monto: 476328 });
  });

  it("tolera valores en minúsculas o numéricos (normalización de MercadoPago)", () => {
    expect(leerCompra({ tipo: "PLAN", plan: "basica", duracion: "semestral", monto: 169860 })).toEqual({
      tipo: "plan",
      plan: "BASICA",
      duracion: "SEMESTRAL",
      monto: 169860,
    });
  });

  it("rechaza planes, duraciones o montos inválidos", () => {
    expect(leerCompra({ tipo: "plan", plan: "ORO", duracion: "ANUAL", monto: "1" })).toBeNull();
    expect(leerCompra({ tipo: "plan", plan: "PREMIUM", duracion: "ETERNO", monto: "1" })).toBeNull();
    expect(leerCompra({ tipo: "plan", plan: "PREMIUM", duracion: "ANUAL" })).toBeNull();
    expect(leerCompra({ tipo: "plan", plan: "PREMIUM", duracion: "ANUAL", monto: "-5" })).toBeNull();
    expect(leerCompra(null)).toBeNull();
    expect(leerCompra({})).toBeNull();
  });

  it("upgrade con y sin datos (preferencias viejas solo traían el tipo)", () => {
    const hasta = enDias(30);
    expect(leerCompra(metadataCompra({ tipo: "upgrade", monto: 5000, hasta }))).toEqual({
      tipo: "upgrade",
      monto: 5000,
      hasta,
    });
    expect(leerCompra({ tipo: "upgrade" })).toEqual({ tipo: "upgrade", monto: null, hasta: null });
  });
});

describe("inferirCompraPorMonto", () => {
  it("deduce plan y duración de un total exacto", () => {
    expect(inferirCompraPorMonto(PREMIUM_BIANUAL)).toMatchObject({ plan: "PREMIUM", duracion: "BIANUAL" });
  });

  it("no infiere nada si el monto no coincide con ningún total", () => {
    expect(inferirCompraPorMonto(1234)).toBeNull();
  });
});

describe("resolverPagoUnico", () => {
  it("otorga lo comprado en ESTE pago", () => {
    const meta = metadataCompra({ tipo: "plan", plan: "BASICA", duracion: "SEMESTRAL", monto: BASICA_SEMESTRAL });
    expect(resolverPagoUnico({ transaction_amount: BASICA_SEMESTRAL, metadata: meta }, { planEndsAt: null }, AHORA)).toEqual({
      accion: "otorgar",
      plan: "BASICA",
      duracion: "SEMESTRAL",
      meses: 6,
    });
  });

  it("ataque: pagar el link de Básico semestral no da Premium bianual (lo que diga planPendiente da igual)", () => {
    const meta = metadataCompra({ tipo: "plan", plan: "BASICA", duracion: "SEMESTRAL", monto: BASICA_SEMESTRAL });
    const decision = resolverPagoUnico({ transaction_amount: BASICA_SEMESTRAL, metadata: meta }, { planEndsAt: null }, AHORA);
    expect(decision).toMatchObject({ plan: "BASICA", meses: 6 });
  });

  it("monto pagado menor al esperado -> revisar, no otorga", () => {
    const meta = metadataCompra({ tipo: "plan", plan: "PREMIUM", duracion: "BIANUAL", monto: PREMIUM_BIANUAL });
    expect(resolverPagoUnico({ transaction_amount: 100, metadata: meta }, { planEndsAt: null }, AHORA).accion).toBe(
      "revisar"
    );
  });

  it("upgrade con el plan vigente -> sube a Premium sin sumar tiempo", () => {
    const meta = metadataCompra({ tipo: "upgrade", monto: 5000, hasta: enDias(30) });
    expect(resolverPagoUnico({ transaction_amount: 5000, metadata: meta }, { planEndsAt: enDias(30) }, AHORA)).toEqual({
      accion: "upgrade",
    });
  });

  it("ataque: upgrade barato pagado con el plan ya vencido -> revisar (antes sumaba meses completos)", () => {
    const meta = metadataCompra({ tipo: "upgrade", monto: 500, hasta: enDias(-2) });
    expect(resolverPagoUnico({ transaction_amount: 500, metadata: meta }, { planEndsAt: enDias(-1) }, AHORA).accion).toBe(
      "revisar"
    );
    expect(resolverPagoUnico({ transaction_amount: 500, metadata: { tipo: "upgrade" } }, { planEndsAt: null }, AHORA).accion).toBe(
      "revisar"
    );
  });

  it("upgrade cuyo vencimiento se extendió después de pedirlo -> revisar", () => {
    const meta = metadataCompra({ tipo: "upgrade", monto: 5000, hasta: enDias(30) });
    expect(resolverPagoUnico({ transaction_amount: 5000, metadata: meta }, { planEndsAt: enDias(210) }, AHORA).accion).toBe(
      "revisar"
    );
  });

  it("preferencia vieja sin metadata: se infiere por monto o se manda a revisar", () => {
    expect(resolverPagoUnico({ transaction_amount: PREMIUM_BIANUAL, metadata: {} }, { planEndsAt: null }, AHORA)).toMatchObject({
      accion: "otorgar",
      plan: "PREMIUM",
      meses: 24,
    });
    expect(resolverPagoUnico({ transaction_amount: 777, metadata: null }, { planEndsAt: null }, AHORA).accion).toBe("revisar");
  });

  it("pago único con duración MENSUAL -> revisar", () => {
    const meta = metadataCompra({ tipo: "plan", plan: "PREMIUM", duracion: "MENSUAL", monto: 44600 });
    expect(resolverPagoUnico({ transaction_amount: 44600, metadata: meta }, { planEndsAt: null }, AHORA).accion).toBe(
      "revisar"
    );
  });
});
