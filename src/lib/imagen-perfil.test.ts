import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  decodificarFotoGuardada,
  detectarFormato,
  esDataUrlFotoValida,
  normalizarFotoPerfil,
} from "./imagen-perfil";

const aDataUrl = (mime: string, bytes: Buffer) => `data:${mime};base64,${bytes.toString("base64")}`;

async function png(width = 40, height = 40) {
  return sharp({ create: { width, height, channels: 4, background: "#3366ff" } }).png().toBuffer();
}

async function jpegConGps() {
  return sharp({ create: { width: 40, height: 40, channels: 3, background: "#ff0000" } })
    .withExif({ IFD3: { GPSLatitudeRef: "S", GPSLatitude: "34/1 36/1 0/1" } })
    .jpeg()
    .toBuffer();
}

const SVG_XSS = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>fetch("/api/patients")</script></svg>'
);

describe("detectarFormato", () => {
  it("reconoce PNG y JPEG por su firma", async () => {
    expect(detectarFormato(await png())).toBe("png");
    expect(detectarFormato(await jpegConGps())).toBe("jpeg");
  });

  it("rechaza SVG y HTML", () => {
    expect(detectarFormato(SVG_XSS)).toBeNull();
    expect(detectarFormato(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull();
  });
});

describe("normalizarFotoPerfil", () => {
  it("acepta un PNG válido y lo devuelve como PNG", async () => {
    const out = await normalizarFotoPerfil(aDataUrl("image/png", await png()));
    expect(out).toMatch(/^data:image\/png;base64,/);
  });

  it("rechaza un SVG declarado como SVG", async () => {
    expect(await normalizarFotoPerfil(aDataUrl("image/svg+xml", SVG_XSS))).toBeNull();
  });

  it("rechaza un SVG disfrazado de PNG", async () => {
    expect(await normalizarFotoPerfil(aDataUrl("image/png", SVG_XSS))).toBeNull();
  });

  it("rechaza bytes con firma PNG pero corruptos", async () => {
    const roto = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), SVG_XSS]);
    expect(await normalizarFotoPerfil(aDataUrl("image/png", roto))).toBeNull();
  });

  it("usa el formato real, no el declarado", async () => {
    const out = await normalizarFotoPerfil(aDataUrl("image/png", await jpegConGps()));
    expect(out).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("elimina los metadatos EXIF (ubicación GPS)", async () => {
    const original = await jpegConGps();
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const out = await normalizarFotoPerfil(aDataUrl("image/jpeg", original));
    const bytes = Buffer.from(out!.split(",")[1], "base64");
    expect((await sharp(bytes).metadata()).exif).toBeUndefined();
  });

  it("achica imágenes grandes a 1024px como máximo", async () => {
    const out = await normalizarFotoPerfil(aDataUrl("image/png", await png(3000, 1500)));
    const meta = await sharp(Buffer.from(out!.split(",")[1], "base64")).metadata();
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(512);
  });

  it("rechaza data URLs con basura después del base64", async () => {
    expect(await normalizarFotoPerfil(`${aDataUrl("image/png", await png())}"><script>`)).toBeNull();
  });
});

describe("decodificarFotoGuardada", () => {
  it("devuelve el MIME según los bytes, no el guardado", async () => {
    const foto = decodificarFotoGuardada(aDataUrl("image/png", await jpegConGps()));
    expect(foto?.mime).toBe("image/jpeg");
  });

  it("ignora fotos viejas que no son PNG/JPEG", () => {
    expect(decodificarFotoGuardada(aDataUrl("image/svg+xml", SVG_XSS))).toBeNull();
    expect(esDataUrlFotoValida(aDataUrl("image/png", SVG_XSS))).toBe(false);
    expect(esDataUrlFotoValida(null)).toBe(false);
  });
});
