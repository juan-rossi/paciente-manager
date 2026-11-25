import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { estadoSala, ventanaSala } from "@/lib/teleconsulta";
import { buildMensajeRecordatorio, plantillaRecordatorio } from "@/lib/recordatorio-mensaje";
import { lugarTrabajoSchema } from "@/lib/lugar-trabajo-schema";

const turno = {
  inicio: new Date("2026-12-01T13:00:00Z"),
  fin: new Date("2026-12-01T13:30:00Z"),
};

describe("ventana de la sala", () => {
  it("abre 15 minutos antes y cierra 60 después del fin", () => {
    const { desde, hasta } = ventanaSala(turno);
    expect(desde.toISOString()).toBe("2026-12-01T12:45:00.000Z");
    expect(hasta.toISOString()).toBe("2026-12-01T14:30:00.000Z");
  });

  it("estado según la hora", () => {
    expect(estadoSala(turno, new Date("2026-12-01T12:44:00Z"))).toBe("antes");
    expect(estadoSala(turno, new Date("2026-12-01T12:45:00Z"))).toBe("abierta");
    expect(estadoSala(turno, new Date("2026-12-01T14:30:00Z"))).toBe("abierta");
    expect(estadoSala(turno, new Date("2026-12-01T14:31:00Z"))).toBe("cerrada");
  });
});

describe("recordatorio con {videollamada}", () => {
  const links = { confirmar: "c", cancelar: "x" };
  const ahora = new Date("2026-12-01T10:00:00Z");

  it("reemplaza la variable en una teleconsulta", () => {
    const m = buildMensajeRecordatorio("Hola {nombre}: {videollamada}", "Ana", turno.inicio, ahora, {
      ...links,
      videollamada: "sala",
    });
    expect(m).toBe("Hola Ana: sala");
  });

  it("agrega el link al final si la plantilla no lo tiene", () => {
    const m = buildMensajeRecordatorio("Hola {nombre}", "Ana", turno.inicio, ahora, {
      ...links,
      videollamada: "sala",
    });
    expect(m.startsWith("Hola Ana\n\n")).toBe(true);
    expect(m.endsWith("sala")).toBe(true);
  });

  it("elige la plantilla de teleconsulta solo si el turno trae link a la sala", () => {
    const plantillas = { general: "presencial", virtual: "virtual" };
    expect(plantillaRecordatorio(plantillas, { videollamada: "sala" })).toBe("virtual");
    expect(plantillaRecordatorio(plantillas, { videollamada: null })).toBe("presencial");
    expect(plantillaRecordatorio(plantillas)).toBe("presencial");
  });

  it("deja la variable vacía en un turno presencial", () => {
    const m = buildMensajeRecordatorio("Hola{videollamada}", "Ana", turno.inicio, ahora, {
      ...links,
      videollamada: null,
    });
    expect(m).toBe("Hola");
  });
});

describe("lugarTrabajoSchema", () => {
  it("un lugar virtual no necesita dirección ni teléfono y se guarda sin ubicación", () => {
    const r = lugarTrabajoSchema.safeParse({ tipo: "VIRTUAL", latitud: 1, ciudad: "X" });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ direccion: "", telefono: "", latitud: null, longitud: null, ciudad: null, nombre: null });
  });

  it("un lugar físico sigue exigiendo dirección y teléfono", () => {
    expect(lugarTrabajoSchema.safeParse({ tipo: "PARTICULAR", telefono: "123" }).success).toBe(false);
    expect(lugarTrabajoSchema.safeParse({ tipo: "PARTICULAR", direccion: "Calle 1" }).success).toBe(false);
    expect(lugarTrabajoSchema.safeParse({ tipo: "PARTICULAR", direccion: "Calle 1", telefono: "123" }).success).toBe(true);
  });
});
