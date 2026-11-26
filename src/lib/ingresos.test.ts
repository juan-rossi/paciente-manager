import { describe, expect, it } from "vitest";
import {
  ingresosPorMes,
  mesDeFechaBA,
  montosVigentes,
  proyectarIngresos,
  rangoMesBA,
  resumirIngresos,
  sumarMeses,
  type Aranceles,
  type TurnoIngreso,
} from "./ingresos";

const aranceles: Aranceles = {
  particular: 25000,
  porCobertura: {
    OSDE: { consulta: 12000, plus: 5000 },
    "Swiss Medical": { consulta: 14000, plus: null },
  },
};

function turno(parcial: Partial<TurnoIngreso>): TurnoIngreso {
  return {
    inicio: new Date("2026-11-10T13:00:00Z"),
    obraSocial: null,
    asistencia: "ASISTIO",
    montoCobertura: null,
    montoPlus: null,
    ...parcial,
  };
}

describe("montosVigentes", () => {
  it("sin obra social usa la consulta particular, sin plus", () => {
    expect(montosVigentes(null, aranceles)).toEqual({ montoCobertura: 25000, montoPlus: null });
    expect(montosVigentes("  ", aranceles)).toEqual({ montoCobertura: 25000, montoPlus: null });
  });

  it("busca la cobertura sin importar mayúsculas ni espacios", () => {
    expect(montosVigentes(" osde ", aranceles)).toEqual({ montoCobertura: 12000, montoPlus: 5000 });
    expect(montosVigentes("Swiss Medical", aranceles)).toEqual({ montoCobertura: 14000, montoPlus: null });
  });

  it("una cobertura que no tiene cargada queda sin monto", () => {
    expect(montosVigentes("IOMA", aranceles)).toEqual({ montoCobertura: null, montoPlus: null });
  });
});

describe("meses en hora de Argentina", () => {
  it("el rango del mes arranca a las 00:00 de Buenos Aires", () => {
    const { desde, hasta } = rangoMesBA("2026-11");
    expect(desde.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });

  it("diciembre cruza de año", () => {
    expect(rangoMesBA("2026-12").hasta.toISOString()).toBe("2027-01-01T03:00:00.000Z");
    expect(sumarMeses("2026-12", 1)).toBe("2027-01");
    expect(sumarMeses("2026-01", -1)).toBe("2025-12");
    expect(sumarMeses("2026-11", -11)).toBe("2025-12");
  });

  it("un turno del 30/11 a las 22hs de Argentina es de noviembre aunque en UTC ya sea diciembre", () => {
    expect(mesDeFechaBA(new Date("2026-12-01T01:00:00Z"))).toBe("2026-11");
    expect(mesDeFechaBA(new Date("2026-12-01T03:00:00Z"))).toBe("2026-12");
  });
});

describe("resumirIngresos", () => {
  const ahora = new Date("2026-11-20T12:00:00Z");

  it("suma solo los atendidos y separa particular, coberturas y plus", () => {
    const resumen = resumirIngresos(
      [
        turno({ montoCobertura: 25000 }),
        turno({ obraSocial: "OSDE", montoCobertura: 12000, montoPlus: 5000 }),
        turno({ obraSocial: "OSDE", montoCobertura: 12000, montoPlus: null }),
        turno({ asistencia: "AUSENTE", montoCobertura: 99999 }),
        turno({ asistencia: null }),
        turno({ asistencia: null, inicio: new Date("2026-11-25T12:00:00Z") }),
      ],
      ahora
    );
    expect(resumen).toMatchObject({
      total: 54000,
      particular: 25000,
      coberturas: 24000,
      plus: 5000,
      atendidos: 3,
      ausentes: 1,
      sinMarcar: 1,
      proximos: 1,
      atendidosSinMonto: 0,
    });
    expect(resumen.porCobertura.map((f) => [f.cobertura, f.consultas, f.total])).toEqual([
      ["OSDE", 2, 29000],
      [PARTICULAR_NOMBRE, 1, 25000],
    ]);
  });

  it("cuenta los atendidos sin monto cargado", () => {
    const resumen = resumirIngresos([turno({ obraSocial: "IOMA" })], ahora);
    expect(resumen.atendidosSinMonto).toBe(1);
    expect(resumen.porCobertura[0]).toMatchObject({ cobertura: "IOMA", consultas: 1, total: 0, sinMonto: 1 });
  });
});

const PARTICULAR_NOMBRE = "Particular";

describe("proyectarIngresos", () => {
  it("estima solo los turnos futuros sin marcar, con aranceles vigentes", () => {
    const ahora = new Date("2026-11-20T12:00:00Z");
    const futuro = new Date("2026-11-25T12:00:00Z");
    expect(
      proyectarIngresos(
        [
          turno({ asistencia: null, inicio: futuro }),
          turno({ asistencia: null, inicio: futuro, obraSocial: "OSDE" }),
          turno({ asistencia: null }), // pasado sin marcar: no se proyecta
          turno({ inicio: futuro }), // ya marcado
        ],
        aranceles,
        ahora
      )
    ).toBe(25000 + 12000 + 5000);
  });
});

describe("ingresosPorMes", () => {
  it("agrupa por mes de Argentina y deja en cero los meses sin datos", () => {
    const filas = ingresosPorMes(
      [
        turno({ inicio: new Date("2026-11-01T01:00:00Z"), montoCobertura: 100 }), // 31/10 22hs AR
        turno({ inicio: new Date("2026-11-05T12:00:00Z"), obraSocial: "OSDE", montoCobertura: 50, montoPlus: 10 }),
        turno({ inicio: new Date("2026-11-05T12:00:00Z"), asistencia: "AUSENTE", montoCobertura: 999 }),
      ],
      ["2026-09", "2026-10", "2026-11"]
    );
    expect(filas).toEqual([
      { mes: "2026-09", particular: 0, coberturas: 0, plus: 0, total: 0 },
      { mes: "2026-10", particular: 100, coberturas: 0, plus: 0, total: 100 },
      { mes: "2026-11", particular: 0, coberturas: 50, plus: 10, total: 60 },
    ]);
  });
});
