import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { fotoInput, normalizarFotoClinica } from "./foto-clinica";

async function jpegConGps(ancho: number, alto: number): Promise<Buffer> {
  return sharp({ create: { width: ancho, height: alto, channels: 3, background: { r: 200, g: 120, b: 100 } } })
    .jpeg()
    .withExif({ IFD3: { GPSLatitudeRef: "S", GPSLatitude: "34/1 36/1 0/1" } })
    .toBuffer();
}

describe("normalizarFotoClinica", () => {
  it("re-codifica a JPEG de hasta 2000 px, con miniatura, y sin metadatos (GPS)", async () => {
    const original = await jpegConGps(4000, 3000);
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const foto = await normalizarFotoClinica(original);
    expect(foto).not.toBeNull();
    expect(foto!.ancho).toBe(2000);
    expect(foto!.alto).toBe(1500);
    const meta = await sharp(foto!.datos).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
    const mini = await sharp(foto!.miniatura).metadata();
    expect([mini.width, mini.height]).toEqual([360, 360]);
  });

  it("no agranda las fotos chicas", async () => {
    const foto = await normalizarFotoClinica(await jpegConGps(800, 600));
    expect([foto!.ancho, foto!.alto]).toEqual([800, 600]);
  });

  it("rechaza lo que no es una imagen (un SVG disfrazado)", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(await normalizarFotoClinica(svg)).toBeNull();
  });
});

describe("fotoInput", () => {
  it("con evolución alcanza la zona; sin evolución (consulta inicial) pide la fecha", () => {
    expect(fotoInput.safeParse({ evolucionId: "ev1", fecha: "", zona: "Espalda", nota: "" }).success).toBe(true);
    expect(fotoInput.safeParse({ evolucionId: "ev1", zona: "  ", nota: "" }).success).toBe(false);
    expect(fotoInput.safeParse({ evolucionId: "", fecha: "2026-11-01", zona: "Espalda" }).success).toBe(true);
    expect(fotoInput.safeParse({ evolucionId: "", fecha: "", zona: "Espalda" }).success).toBe(false);
    expect(fotoInput.safeParse({ evolucionId: "", fecha: "01/11/2026", zona: "Espalda" }).success).toBe(false);
  });
});
