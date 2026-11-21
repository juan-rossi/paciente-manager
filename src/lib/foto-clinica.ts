import sharp from "sharp";
import { z } from "zod";
import { esFechaValida, TEXTO_CORTO, TEXTO_MEDIO } from "@/lib/limites-texto";
import { detectarFormato } from "@/lib/imagen-perfil";

// Fotos clínicas (ver PatientFoto en prisma/schema.prisma). Igual que la foto
// de perfil, nunca se guarda lo que manda el cliente: se valida por los bytes
// y se re-codifica a JPEG, lo que además descarta los metadatos (EXIF, GPS).

// El cliente ya la achica antes de subir (Vercel corta los cuerpos de más de
// 4,5 MB); esto es el tope del servidor.
export const BYTES_MAXIMOS_FOTO = 4 * 1024 * 1024;
const LADO_MAXIMO = 2000;
const LADO_MINIATURA = 360;
const PIXELES_MAXIMOS = 60_000_000;

function esWebp(b: Uint8Array): boolean {
  return (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 && // RIFF
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50 // WEBP
  );
}

export type FotoNormalizada = {
  datos: Buffer;
  miniatura: Buffer;
  ancho: number;
  alto: number;
};

// JPEG, PNG o WebP real -> JPEG de hasta 2000 px más una miniatura. Null si
// no es una imagen decodificable.
export async function normalizarFotoClinica(
  original: Buffer,
): Promise<FotoNormalizada | null> {
  if (!detectarFormato(original) && !esWebp(original)) return null;
  try {
    const base = sharp(original, {
      limitInputPixels: PIXELES_MAXIMOS,
      failOn: "error",
    }).rotate();
    const { data: datos, info } = await base
      .clone()
      .resize({
        width: LADO_MAXIMO,
        height: LADO_MAXIMO,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    const miniatura = await base
      .clone()
      .resize({ width: LADO_MINIATURA, height: LADO_MINIATURA, fit: "cover" })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();
    return { datos, miniatura, ancho: info.width, alto: info.height };
  } catch {
    return null;
  }
}

// Los campos de texto que acompañan la foto (vienen en el FormData). Una foto
// es de una evolución (y toma su fecha) o de la consulta inicial (sin
// evolución, con su propia fecha).
export const fotoInput = z
  .object({
    evolucionId: z
      .string()
      .trim()
      .transform((v) => (v.length === 0 ? null : v))
      .nullable()
      .optional(),
    fecha: z
      .string()
      .trim()
      .transform((v) => (v.length === 0 ? null : v))
      .nullable()
      .optional(),
    zona: z
      .string()
      .trim()
      .min(1, "Indicá la zona del cuerpo.")
      .max(TEXTO_CORTO, `Máximo ${TEXTO_CORTO} caracteres.`),
    nota: z
      .string()
      .trim()
      .max(TEXTO_MEDIO, `Máximo ${TEXTO_MEDIO} caracteres.`)
      .transform((v) => (v.length === 0 ? null : v))
      .nullable()
      .optional(),
  })
  .refine(
    (d) => d.evolucionId != null || (d.fecha != null && esFechaValida(d.fecha)),
    {
      message: "Indicá la fecha de la consulta inicial.",
      path: ["fecha"],
    },
  );

// Lo que la UI necesita de una foto (sin los bytes: esos se piden aparte).
export type FotoValue = {
  id: string;
  evolucionId: string | null;
  fecha: string;
  zona: string;
  nota: string | null;
  ancho: number;
  alto: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fotoFromDb(f: any): FotoValue {
  const fecha =
    typeof f.fecha === "string" ? f.fecha : new Date(f.fecha).toISOString();
  return {
    id: f.id,
    evolucionId: f.evolucionId ?? null,
    fecha: fecha.slice(0, 10),
    zona: f.zona,
    nota: f.nota ?? null,
    ancho: f.ancho,
    alto: f.alto,
  };
}

// Fotos visibles: no eliminadas y de una evolución que tampoco lo esté (al
// eliminar una evolución, sus fotos se ocultan con ella).
export const WHERE_FOTO_VISIBLE = {
  deletedAt: null,
  OR: [{ evolucionId: null }, { evolucion: { deletedAt: null } }],
};

// Campos de PatientFoto sin los bytes, para listarlas.
export const SELECT_FOTO_SIN_DATOS = {
  id: true,
  evolucionId: true,
  fecha: true,
  zona: true,
  nota: true,
  ancho: true,
  alto: true,
} as const;
