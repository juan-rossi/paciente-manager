import { describe, expect, it } from "vitest";
import {
  estaActivado,
  proximoMailEngagement,
  type DoctorEngagement,
  type Hitos,
  type MailEngagementTipo,
} from "@/lib/engagement";

const AHORA = new Date("2026-11-27T12:00:00Z");
const DIA = 86_400_000;
const haceDias = (n: number) => new Date(AHORA.getTime() - n * DIA);
const enDias = (n: number) => new Date(AHORA.getTime() + n * DIA);

const SIN_NADA: Hitos = { lugares: 0, horarios: 0, pacientes: 0, turnos: 0, evoluciones: 0, dictados: 0 };
const OPC = { fundadorHabilitado: true };

function doctor(
  diasDesdeAlta: number,
  over: Partial<Omit<DoctorEngagement, "enviados">> & {
    enviados?: [MailEngagementTipo, number][];
  } = {}
): DoctorEngagement {
  const plan = over.plan ?? "BASICA";
  const trial = plan === "PREMIUM" ? 30 : 60;
  return {
    plan,
    createdAt: haceDias(diasDesdeAlta),
    trialEndsAt: over.trialEndsAt !== undefined ? over.trialEndsAt : enDias(trial - diasDesdeAlta),
    hitos: over.hitos ?? SIN_NADA,
    enviados: (over.enviados ?? []).map(([tipo, hace]) => ({ tipo, enviadoAt: haceDias(hace) })),
  };
}

describe("estaActivado", () => {
  it("necesita 3 pacientes y un turno o una evolución", () => {
    expect(estaActivado({ ...SIN_NADA, pacientes: 3 })).toBe(false);
    expect(estaActivado({ ...SIN_NADA, pacientes: 2, turnos: 5 })).toBe(false);
    expect(estaActivado({ ...SIN_NADA, pacientes: 3, turnos: 1 })).toBe(true);
    expect(estaActivado({ ...SIN_NADA, pacientes: 3, evoluciones: 1 })).toBe(true);
  });
});

describe("proximoMailEngagement - activación", () => {
  it("nada el primer día (ya salió la bienvenida)", () => {
    expect(proximoMailEngagement(doctor(1), AHORA, OPC)).toBeNull();
  });

  it("día 2 sin lugar ni horarios: configurar consultorio", () => {
    expect(proximoMailEngagement(doctor(2), AHORA, OPC)).toBe("CONFIGURAR_CONSULTORIO");
  });

  it("con el perfil listo se saltea configurar y espera al día 4", () => {
    const hitos = { ...SIN_NADA, lugares: 1, horarios: 2 };
    expect(proximoMailEngagement(doctor(3, { hitos }), AHORA, OPC)).toBeNull();
    expect(proximoMailEngagement(doctor(4, { hitos }), AHORA, OPC)).toBe("PRIMER_PACIENTE");
  });

  it("respeta los 3 días entre mails", () => {
    const d = (enviadoHace: number) => doctor(5, { enviados: [["CONFIGURAR_CONSULTORIO", enviadoHace]] });
    expect(proximoMailEngagement(d(2), AHORA, OPC)).toBeNull();
    expect(proximoMailEngagement(d(3), AHORA, OPC)).toBe("PRIMER_PACIENTE");
  });

  it("no repite un mail ya enviado", () => {
    const d = doctor(7, {
      enviados: [
        ["CONFIGURAR_CONSULTORIO", 5],
        ["PRIMER_PACIENTE", 3],
      ],
    });
    expect(proximoMailEngagement(d, AHORA, OPC)).toBe("FUNDADOR");
  });

  it("sin remitente del fundador configurado, lo saltea", () => {
    const d = doctor(21, {
      enviados: [
        ["CONFIGURAR_CONSULTORIO", 19],
        ["PRIMER_PACIENTE", 17],
      ],
    });
    expect(proximoMailEngagement(d, AHORA, { fundadorHabilitado: false })).toBe("SEGUIMIENTO");
  });

  it("con pacientes pero sin turnos, día 10: primer turno", () => {
    const hitos = { ...SIN_NADA, lugares: 1, horarios: 1, pacientes: 1 };
    const d = doctor(10, { hitos, enviados: [["FUNDADOR", 4]] });
    expect(proximoMailEngagement(d, AHORA, OPC)).toBe("PRIMER_TURNO");
  });

  it("Premium: dictado antes que turno", () => {
    const hitos = { ...SIN_NADA, lugares: 1, horarios: 1, pacientes: 1 };
    const d = doctor(12, { plan: "PREMIUM", hitos, enviados: [["FUNDADOR", 6]] });
    expect(proximoMailEngagement(d, AHORA, OPC)).toBe("PRIMER_DICTADO");
  });

  it("Básico nunca recibe el de dictado", () => {
    const hitos = { ...SIN_NADA, lugares: 1, horarios: 1, pacientes: 1, turnos: 1 };
    const d = doctor(15, { hitos, enviados: [["FUNDADOR", 9]] });
    expect(proximoMailEngagement(d, AHORA, OPC)).toBeNull();
  });

  it("activado: no recibe más mails de activación", () => {
    const hitos = { ...SIN_NADA, lugares: 1, horarios: 1, pacientes: 5, turnos: 2 };
    expect(proximoMailEngagement(doctor(25, { hitos }), AHORA, OPC)).toBeNull();
  });

  it("cerca del fin del trial no se mandan mails de activación", () => {
    const d = doctor(54, {
      enviados: [
        ["CONFIGURAR_CONSULTORIO", 50],
        ["PRIMER_PACIENTE", 48],
        ["FUNDADOR", 46],
        ["SEGUIMIENTO", 30],
        ["TRIAL_TERMINA_PRONTO", 1],
      ],
    });
    expect(proximoMailEngagement(d, AHORA, OPC)).toBeNull();
  });
});

describe("proximoMailEngagement - fin del trial", () => {
  it("a 7 días: termina pronto (también para activados)", () => {
    const hitos = { ...SIN_NADA, lugares: 1, horarios: 1, pacientes: 5, turnos: 2 };
    expect(proximoMailEngagement(doctor(53, { hitos }), AHORA, OPC)).toBe("TRIAL_TERMINA_PRONTO");
  });

  it("a 1 día: termina mañana", () => {
    const d = doctor(59, { enviados: [["TRIAL_TERMINA_PRONTO", 6]] });
    expect(proximoMailEngagement(d, AHORA, OPC)).toBe("TRIAL_TERMINA_MANANA");
  });

  it("no dos avisos el mismo día", () => {
    const d = doctor(59, { enviados: [["TRIAL_TERMINA_PRONTO", 0.5]] });
    expect(proximoMailEngagement(d, AHORA, OPC)).toBeNull();
  });

  it("vencido: entre el día 3 y el 10 después del fin, una sola vez", () => {
    expect(proximoMailEngagement(doctor(62), AHORA, OPC)).toBeNull();
    expect(proximoMailEngagement(doctor(63), AHORA, OPC)).toBe("TRIAL_VENCIDO");
    expect(proximoMailEngagement(doctor(70), AHORA, OPC)).toBe("TRIAL_VENCIDO");
    expect(proximoMailEngagement(doctor(71), AHORA, OPC)).toBeNull();
    const yaEnviado = doctor(65, { enviados: [["TRIAL_VENCIDO", 2]] });
    expect(proximoMailEngagement(yaEnviado, AHORA, OPC)).toBeNull();
  });

  it("sin trial (fecha nula): nada", () => {
    expect(proximoMailEngagement(doctor(10, { trialEndsAt: null }), AHORA, OPC)).toBeNull();
  });
});
