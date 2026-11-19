import sharp from "sharp";

// La foto de perfil se guarda como data URL en la base y se sirve tal cual
// desde el dominio propio (ver `/api/directorio/[slug]/foto`). Por eso nunca
// se guarda lo que manda el cliente: se valida por los bytes reales (no por
// el MIME que declara) y se re-codifica acá. Eso descarta SVG/HTML
// disfrazados de imagen (XSS en nuestro origen), elimina metadatos EXIF
// (incluida la ubicación GPS de fotos sacadas con el celular) y acota el
// tamaño.
//
// Solo PNG y JPEG: es lo que deja elegir Mi perfil y lo único que Satori
// decodifica en las imágenes OG y en la placa de bienvenida.

export type FormatoFoto = "png" | "jpeg";

export const MIME_FOTO: Record<FormatoFoto, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
};

const LADO_MAXIMO = 1024;
// Corta "bombas" de descompresión: un PNG chico que declara 50.000x50.000 px.
const PIXELES_MAXIMOS = 40_000_000;

const DATA_URL_FOTO = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/]+={0,2})$/;

/** Detecta el formato por la firma del archivo, no por lo que declara. */
export function detectarFormato(bytes: Uint8Array): FormatoFoto | null {
  const esPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  if (esPng) return "png";
  const esJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (esJpeg) return "jpeg";
  return null;
}

/**
 * Valida y re-codifica una foto de perfil recibida como data URL. Devuelve
 * `null` si no es un PNG/JPEG real y decodificable.
 */
export async function normalizarFotoPerfil(dataUrl: string): Promise<string | null> {
  const match = DATA_URL_FOTO.exec(dataUrl);
  if (!match) return null;

  const original = Buffer.from(match[2], "base64");
  const formato = detectarFormato(original);
  if (!formato) return null;

  try {
    const imagen = sharp(original, { limitInputPixels: PIXELES_MAXIMOS, failOn: "error" })
      // Aplica la orientación EXIF antes de descartar los metadatos (si no,
      // las fotos verticales del celular quedarían acostadas).
      .rotate()
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: "inside", withoutEnlargement: true });
    // sharp no copia metadatos (EXIF/GPS/ICC) a la salida salvo que se pida.
    const salida =
      formato === "png"
        ? await imagen.png({ compressionLevel: 9 }).toBuffer()
        : await imagen.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    return `data:${MIME_FOTO[formato]};base64,${salida.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Para servir una foto ya guardada: devuelve los bytes y el MIME solo si es
 * un PNG/JPEG real. Cualquier otra cosa (p.ej. una foto guardada antes de que
 * existiera esta validación) se trata como inexistente.
 */
export function decodificarFotoGuardada(
  dataUrl: string | null | undefined
): { bytes: Buffer; mime: string } | null {
  if (!dataUrl) return null;
  const match = DATA_URL_FOTO.exec(dataUrl);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  const formato = detectarFormato(bytes);
  if (!formato) return null;
  return { bytes, mime: MIME_FOTO[formato] };
}

/** Si una data URL ya guardada es un PNG/JPEG real (sin re-codificarla). */
export function esDataUrlFotoValida(dataUrl: string | null | undefined): boolean {
  return decodificarFotoGuardada(dataUrl) !== null;
}
