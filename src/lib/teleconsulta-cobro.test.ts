import { describe, expect, it } from "vitest";
import { montoDeTeleconsulta, normalizarAliasCobro, textoPago } from "./teleconsulta-cobro";
import { buildMensajeRecordatorio } from "./recordatorio-mensaje";

describe("normalizarAliasCobro", () => {
  it("vacío se guarda como null", () => {
    expect(normalizarAliasCobro("   ")).toEqual({ ok: true, valor: null });
    expect(normalizarAliasCobro(null)).toEqual({ ok: true, valor: null });
  });

  it("acepta un alias válido tal cual", () => {
    expect(normalizarAliasCobro(" consultorio.perez.mp ")).toEqual({ ok: true, valor: "consultorio.perez.mp" });
  });

  it("acepta un CBU de 22 números y le saca espacios y guiones", () => {
    expect(normalizarAliasCobro("0110599 5200000 0123-4567")).toEqual({
      ok: true,
      valor: "0110599520000001234567",
    });
  });

  it("rechaza un CBU incompleto y un alias inválido", () => {
    expect(normalizarAliasCobro("12345").ok).toBe(false);
    expect(normalizarAliasCobro("mi alias").ok).toBe(false);
    expect(normalizarAliasCobro("abc").ok).toBe(false);
  });
});

describe("textoPago", () => {
  it("por adelantado, con alias", () => {
    expect(textoPago({ teleconsultaCobro: "ANTES", aliasCobro: "dr.perez" })).toBe(
      "Recordá abonar la consulta por transferencia al alias \"dr.perez\" antes del turno."
    );
  });

  it("después, sin alias", () => {
    expect(textoPago({ teleconsultaCobro: "DESPUES", aliasCobro: null })).toBe(
      "La consulta se abona al terminar la videollamada."
    );
  });

  it("dice si es un CBU o un CVU", () => {
    expect(textoPago({ teleconsultaCobro: "ANTES", aliasCobro: "0110599520000001234567", monto: 20000 })).toBe(
      'Recordá abonar la consulta ($20.000) por transferencia al CBU "0110599520000001234567" antes del turno.'
    );
    expect(textoPago({ teleconsultaCobro: "DESPUES", aliasCobro: "0000003100012345678901" })).toBe(
      'La consulta se abona al terminar la videollamada por transferencia al CVU "0000003100012345678901".'
    );
  });
});

describe("monto de la teleconsulta", () => {
  it("usa el de la consulta particular si así lo eligió", () => {
    expect(
      montoDeTeleconsulta({ montoTeleconsulta: 30000, montoTeleconsultaUsaParticular: true }, 20000)
    ).toBe(20000);
    expect(
      montoDeTeleconsulta({ montoTeleconsulta: 30000, montoTeleconsultaUsaParticular: true }, null)
    ).toBeNull();
  });

  it("usa el propio si eligió otro monto", () => {
    expect(
      montoDeTeleconsulta({ montoTeleconsulta: 30000, montoTeleconsultaUsaParticular: false }, 20000)
    ).toBe(30000);
  });

  it("{pago} incluye el monto, antes y después", () => {
    expect(textoPago({ teleconsultaCobro: "ANTES", aliasCobro: "dr.perez", monto: 20000 })).toBe(
      "Recordá abonar la consulta ($20.000) por transferencia al alias \"dr.perez\" antes del turno."
    );
    expect(textoPago({ teleconsultaCobro: "DESPUES", aliasCobro: null, monto: 15500 })).toBe(
      "La consulta ($15.500) se abona al terminar la videollamada."
    );
  });
});

describe("{pago} y {alias} en el recordatorio", () => {
  const inicio = new Date("2026-12-01T13:00:00Z");
  const ahora = new Date("2026-12-01T10:00:00Z");
  const links = { confirmar: "c", cancelar: "x" };
  const cobro = { teleconsultaCobro: "ANTES" as const, aliasCobro: "dr.perez" };

  it("en una teleconsulta completa las dos", () => {
    const m = buildMensajeRecordatorio("{pago} Alias: {alias} {videollamada}", "Ana", inicio, ahora, {
      ...links,
      videollamada: "sala",
    }, cobro);
    expect(m).toBe('Recordá abonar la consulta por transferencia al alias "dr.perez" antes del turno. Alias: dr.perez sala');
  });

  it("en un turno presencial {pago} queda vacío y {alias} se completa", () => {
    const m = buildMensajeRecordatorio("[{pago}] {alias}", "Ana", inicio, ahora, links, cobro);
    expect(m).toBe("[] dr.perez");
  });

  it("sin configuración de cobro las variables quedan tal cual", () => {
    expect(buildMensajeRecordatorio("{pago} {alias}", "Ana", inicio, ahora, links)).toBe("{pago} {alias}");
  });
});
