import { describe, expect, it } from "vitest";
import { avisoPorCambioDeModalidad } from "@/lib/teleconsulta-modalidad";
import { buildMensajeCambioModalidad } from "@/lib/recordatorio-mensaje";

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

  it("a teleconsulta incluye el link de la sala y los de confirmar/cancelar", () => {
    const m = buildMensajeCambioModalidad(
      "Ana",
      inicio,
      { aTeleconsulta: true, links: { sala: "x.com/t/abc/sala", confirmar: "x.com/t/abc/si", cancelar: "x.com/t/abc/no" } },
      ahora
    );
    expect(m).toBe(
      "Hola Ana, te avisamos que tu turno mañana a las 10:00 hs va a ser por videollamada (teleconsulta). A esa hora entrá a la videollamada desde acá: x.com/t/abc/sala\n\n" +
        "Confirmá tu asistencia: x.com/t/abc/si\n" +
        "Si no podés asistir, cancelá acá: x.com/t/abc/no"
    );
  });

  it("a presencial dice dónde, si se sabe", () => {
    expect(
      buildMensajeCambioModalidad("Ana", inicio, { aTeleconsulta: false, dondeAtiende: "Av. X 123, Rosario" }, ahora)
    ).toBe(
      "Hola Ana, te avisamos que tu turno mañana a las 10:00 hs ya no va a ser por videollamada: es presencial, en Av. X 123, Rosario."
    );
    expect(buildMensajeCambioModalidad("Ana", inicio, { aTeleconsulta: false, dondeAtiende: null }, ahora)).toMatch(
      /es presencial\.$/
    );
  });
});
