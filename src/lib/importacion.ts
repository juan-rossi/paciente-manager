import { z } from "zod";

// Plazos del Acuerdo de tratamiento de datos, punto 3 (importación de HC).
// Si cambian, cambia el acuerdo: subir `ACUERDO_DATOS_VERSION`.
export const IMPORTACION_ACCESO_HORAS = 48;
export const IMPORTACION_DIAS_ARCHIVOS = 7;

// Vercel corta el body de una función en ~4,5 MB: cada archivo viaja en su
// propio request, así que este es el tope por archivo.
export const IMPORTACION_BYTES_MAXIMOS_ARCHIVO = 4 * 1024 * 1024;
export const IMPORTACION_ARCHIVOS_MAXIMOS = 20;

// Lo que acepta la migración (ver la sección "Migración" de la landing):
// planillas, documentos de texto y exports de otros sistemas. Las imágenes y
// los PDF escaneados quedan afuera a propósito. Se valida por extensión: el
// equipo nunca abre los archivos en el navegador (se descargan como adjunto).
export const IMPORTACION_EXTENSIONES = [
  ".xlsx",
  ".xls",
  ".ods",
  ".csv",
  ".tsv",
  ".txt",
  ".docx",
  ".doc",
  ".odt",
  ".rtf",
  ".pdf",
  ".json",
  ".xml",
  ".sql",
  ".zip",
] as const;

export function extensionPermitida(nombre: string): boolean {
  const lower = nombre.toLowerCase();
  return IMPORTACION_EXTENSIONES.some((ext) => lower.endsWith(ext));
}

// Nombre seguro para guardar y para el Content-Disposition de la descarga:
// sin rutas, sin caracteres de control y con un largo razonable.
export function normalizarNombreArchivo(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? "archivo";
  const limpio = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim();
  return (limpio || "archivo").slice(0, 200);
}

export function accesoVigente(accesoHasta: Date | null, ahora = new Date()): boolean {
  return accesoHasta !== null && accesoHasta.getTime() > ahora.getTime();
}

export function nuevoAccesoHasta(ahora = new Date()): Date {
  return new Date(ahora.getTime() + IMPORTACION_ACCESO_HORAS * 60 * 60 * 1000);
}

// Fecha límite en la que los archivos se borran solos (cron de limpieza).
export function archivosVencenEl(createdAt: Date): Date {
  return new Date(createdAt.getTime() + IMPORTACION_DIAS_ARCHIVOS * 24 * 60 * 60 * 1000);
}

// Estados en los que la importación todavía está "en curso" para el médico:
// a lo sumo una a la vez.
export const ESTADOS_IMPORTACION_ABIERTOS = ["BORRADOR", "ENVIADA", "CARGADA"] as const;

// Con una importación en alguno de estos estados el dashboard deja de mostrar
// el acceso rápido "Importá tus historias clínicas": ya está en progreso
// (BORRADOR = subiendo archivos, ENVIADA) o el equipo la terminó (CARGADA,
// CONFIRMADA). Si se cancela, vence o se rechaza, el acceso rápido vuelve.
export const ESTADOS_IMPORTACION_SIN_SUGERENCIA = ["BORRADOR", "ENVIADA", "CARGADA", "CONFIRMADA"] as const;

export const crearImportacionSchema = z.object({
  nota: z.string().trim().max(2000, "La nota es demasiado larga.").optional(),
  aceptaAcuerdo: z.literal(true, { error: "Tenés que aceptar el Acuerdo de tratamiento de datos." }),
  declaraDatos: z.literal(true, {
    error: "Tenés que confirmar que los datos son de tus pacientes y que podés usarlos.",
  }),
});

export const accesoImportacionSchema = z.object({
  accion: z.enum(["revocar", "renovar"]),
});

export const cargadaImportacionSchema = z.object({
  notaEquipo: z.string().trim().max(2000, "La nota es demasiado larga.").optional(),
});

// El equipo no puede cargar la importación con esos archivos: el motivo es
// obligatorio, es lo único que el médico tiene para saber qué mandar de nuevo.
export const rechazarImportacionSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(10, "Contale al médico qué pasó con los archivos.")
    .max(2000, "El mensaje es demasiado largo."),
});

// "Quiero importar mis historias clínicas" del registro: con Google el
// formulario de /signup se salta, así que la casilla viaja en esta cookie
// (igual que los términos) y src/auth.ts la lee al crear la cuenta.
export const IMPORTAR_HC_COOKIE = "semio_importar_hc";
