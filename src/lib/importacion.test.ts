import { describe, expect, it } from "vitest";
import {
  accesoVigente,
  archivosVencenEl,
  crearImportacionSchema,
  extensionPermitida,
  normalizarNombreArchivo,
  nuevoAccesoHasta,
} from "./importacion";
import { diasParaEliminacion, eliminacionProgramadaPara } from "./baja-cuenta";

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

describe("importación de HC", () => {
  it("el permiso al equipo dura 48 horas", () => {
    const ahora = new Date("2026-11-22T12:00:00Z");
    expect(nuevoAccesoHasta(ahora).getTime() - ahora.getTime()).toBe(48 * HORA);
  });

  it("el permiso vence en el momento exacto", () => {
    const hasta = new Date("2026-11-24T12:00:00Z");
    expect(accesoVigente(hasta, new Date(hasta.getTime() - 1))).toBe(true);
    expect(accesoVigente(hasta, hasta)).toBe(false);
    expect(accesoVigente(null)).toBe(false);
  });

  it("los archivos se borran a los 7 días de subidos", () => {
    const creada = new Date("2026-11-22T12:00:00Z");
    expect(archivosVencenEl(creada).getTime() - creada.getTime()).toBe(7 * DIA);
  });

  it("acepta planillas, documentos y exports, y rechaza ejecutables e imágenes", () => {
    expect(extensionPermitida("Pacientes 2024.XLSX")).toBe(true);
    expect(extensionPermitida("export.zip")).toBe(true);
    expect(extensionPermitida("historias.docx")).toBe(true);
    expect(extensionPermitida("instalador.exe")).toBe(false);
    expect(extensionPermitida("foto.jpg")).toBe(false);
    expect(extensionPermitida("planilla.xlsx.exe")).toBe(false);
  });

  it("normaliza el nombre: sin rutas, comillas ni caracteres de control", () => {
    expect(normalizarNombreArchivo("C:\\Users\\dr\\pacientes.csv")).toBe("pacientes.csv");
    expect(normalizarNombreArchivo('../../"evil"\n.csv')).toBe("evil.csv");
    expect(normalizarNombreArchivo("   ")).toBe("archivo");
  });

  it("exige aceptar el acuerdo y la declaración sobre los datos", () => {
    expect(crearImportacionSchema.safeParse({ aceptaAcuerdo: true, declaraDatos: true }).success).toBe(true);
    expect(crearImportacionSchema.safeParse({ aceptaAcuerdo: true, declaraDatos: false }).success).toBe(false);
    expect(crearImportacionSchema.safeParse({ declaraDatos: true }).success).toBe(false);
  });
});

describe("baja de cuenta", () => {
  it("los datos se borran a los 90 días de la baja", () => {
    const baja = new Date("2026-11-22T12:00:00Z");
    expect(eliminacionProgramadaPara(baja).getTime() - baja.getTime()).toBe(90 * DIA);
  });

  it("cuenta los días que quedan, sin bajar de cero", () => {
    const baja = new Date("2026-11-22T12:00:00Z");
    expect(diasParaEliminacion(baja, baja)).toBe(90);
    expect(diasParaEliminacion(baja, new Date(baja.getTime() + 89.5 * DIA))).toBe(1);
    expect(diasParaEliminacion(baja, new Date(baja.getTime() + 200 * DIA))).toBe(0);
  });
});
