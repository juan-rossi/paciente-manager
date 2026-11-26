import { describe, expect, it } from "vitest";
import { avisoPorCambioDeModalidad } from "@/lib/teleconsulta-modalidad";
import { buildMensajePasoTeleconsulta, buildMensajeVueltaPresencial } from "@/lib/recordatorio-mensaje";

describe("aviso al cambiar la modalidad", () => {
  it("deja el turno pendiente de notificar", () => {
    expect(avisoPorCambioDeModalidad({ avisoPendiente: false, avisoPendienteMotivo: null }, true)).toEqual({
      avisoPendiente: true,
      avisoPendienteMotivo: "PASADO_A_TELECONSULTA",
      avisoPendienteFechaAnterior: null,
    });
    expect(avisoPorCambioDeModalidad({ avisoPendiente: false, avisoPendienteMotivo: null }, false)).toMatchObject({
      avisoPendiente: true,
      avisoPendienteMotivo: "PASADO_A_PRESENCIAL",
    });
  });

  it("ida y vuelta sin avisar: sale de pendientes", () => {
    expect(
      avisoPorCambioDeModalidad({ avisoPendiente: true, avisoPendienteMotivo: "PASADO_A_TELECONSULTA" }, false)
    ).toEqual({ avisoPendiente: false, avisoPendienteMotivo: null, avisoPendienteFechaAnterior: null });
    expect(
      avisoPorCambioDeModalidad({ avisoPendiente: true, avisoPendienteMotivo: "PASADO_A_PRESENCIAL" }, true)
    ).toMatchObject({ avisoPendiente: false });
  });

  it("pisa un aplazamiento pendiente (el mensaje ya dice la fecha nueva)", () => {
    expect(avisoPorCambioDeModalidad({ avisoPendiente: true, avisoPendienteMotivo: "APLAZADO" }, true)).toMatchObject({
      avisoPendiente: true,
      avisoPendienteMotivo: "PASADO_A_TELECONSULTA",
      avisoPendienteFechaAnterior: null,
    });
  });
});

describe("mensaje de cambio de modalidad", () => {
  // 10:00 en Buenos Aires.
  const inicio = new Date("2026-12-01T13:00:00Z");
  const ahora = new Date("2026-11-30T12:00:00Z");
  const links = { sala: "x.com/t/abc/sala", confirmar: "x.com/t/abc/si", cancelar: "x.com/t/abc/no" };
  const cobro = { teleconsultaCobro: "ANTES" as const, aliasCobro: "mi.alias", monto: 20000 };
  // El default de `User.mensajeTemplatePasoTeleconsulta`.
  const PLANTILLA =
    "Hola {nombre}, te avisamos que tu turno para {fecha} a las {hora}hs va a ser por videollamada (teleconsulta). A esa hora entrá a la videollamada desde acá: {videollamada}\n\n" +
    "Confirmá tu asistencia: {confirmar}\nSi no podés venir, cancelá acá: {cancelar}";

  it("a teleconsulta usa la plantilla del médico con los links", () => {
    expect(buildMensajePasoTeleconsulta({ plantilla: PLANTILLA, cobro }, "Ana", inicio, links, ahora)).toBe(
      "Hola Ana, te avisamos que tu turno para mañana a las 10:00hs va a ser por videollamada (teleconsulta). A esa hora entrá a la videollamada desde acá: x.com/t/abc/sala\n\n" +
        "Confirmá tu asistencia: x.com/t/abc/si\n" +
        "Si no podés venir, cancelá acá: x.com/t/abc/no"
    );
  });

  it("completa {pago} y {alias}", () => {
    expect(
      buildMensajePasoTeleconsulta({ plantilla: "{videollamada} {pago} Alias: {alias}", cobro }, "Ana", inicio, links, ahora)
    ).toBe("x.com/t/abc/sala Recordá abonar la consulta ($ 20.000) por transferencia a mi.alias antes del turno. Alias: mi.alias");
  });

  it("sin {videollamada} en la plantilla, el link de la sala va al final", () => {
    expect(buildMensajePasoTeleconsulta({ plantilla: "Hola {nombre}", cobro }, "Ana", inicio, links, ahora)).toBe(
      "Hola Ana\n\nEntrá a la videollamada desde acá a la hora del turno: x.com/t/abc/sala"
    );
  });

  it("sin links saca las variables de link y lo que queda colgando", () => {
    expect(buildMensajePasoTeleconsulta({ plantilla: PLANTILLA, cobro }, "Ana", inicio, null, ahora)).toBe(
      "Hola Ana, te avisamos que tu turno para mañana a las 10:00hs va a ser por videollamada (teleconsulta)."
    );
  });

  it("a presencial dice dónde, si se sabe", () => {
    expect(buildMensajeVueltaPresencial("Ana", inicio, "Av. X 123, Rosario", ahora)).toBe(
      "Hola Ana, te avisamos que tu turno mañana a las 10:00 hs ya no va a ser por videollamada: es presencial, en Av. X 123, Rosario."
    );
    expect(buildMensajeVueltaPresencial("Ana", inicio, null, ahora)).toMatch(/es presencial\.$/);
  });
});
