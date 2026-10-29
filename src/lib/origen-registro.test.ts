import { describe, expect, it } from "vitest";
import { canalDeOrigen, leerOrigenCookie, origenDeVisita, serializarOrigen } from "./origen-registro";

const url = (path: string) => new URL(`https://semio360.com${path}`);

describe("origenDeVisita", () => {
  it("toma los utm_* del link y la página de entrada", () => {
    expect(origenDeVisita(url("/?utm_source=instagram&utm_medium=bio"), "", undefined)).toEqual({
      utmSource: "instagram",
      utmMedium: "bio",
      registroLanding: "/",
    });
  });

  it("un link con utm_* pisa un origen ya guardado", () => {
    expect(origenDeVisita(url("/signup?utm_source=meta"), "", "algo")).toMatchObject({ utmSource: "meta" });
  });

  it("sin utm_* solo registra la primera visita", () => {
    expect(origenDeVisita(url("/"), "https://www.google.com/", "algo")).toBeNull();
    expect(origenDeVisita(url("/directorio"), "https://www.google.com/", undefined)).toEqual({
      registroReferrer: "www.google.com",
      registroLanding: "/directorio",
    });
  });

  it("ignora el referrer del mismo sitio", () => {
    expect(origenDeVisita(url("/"), "https://semio360.com/directorio", undefined)).toEqual({
      registroLanding: "/",
    });
  });
});

describe("leerOrigenCookie", () => {
  it("lee lo que serializa el cliente, codificado o no", () => {
    const origen = { utmSource: "instagram", utmCampaign: "50% off" };
    expect(leerOrigenCookie(serializarOrigen(origen))).toEqual(origen);
    expect(leerOrigenCookie(JSON.stringify(origen))).toEqual(origen);
  });

  it("descarta valores inválidos sin fallar", () => {
    expect(leerOrigenCookie(undefined)).toEqual({});
    expect(leerOrigenCookie("%%no-json")).toEqual({});
    expect(leerOrigenCookie(JSON.stringify({ utmSource: 3, otro: "x" }))).toEqual({});
  });
});

describe("canalDeOrigen", () => {
  const base = { utmSource: null, registroReferrer: null, registroLanding: null };

  it("prioriza utm_source", () => {
    expect(canalDeOrigen({ ...base, utmSource: "Instagram", registroReferrer: "google.com" })).toBe("instagram");
  });

  it("agrupa los referrers conocidos", () => {
    expect(canalDeOrigen({ ...base, registroReferrer: "l.instagram.com" })).toBe("instagram");
    expect(canalDeOrigen({ ...base, registroReferrer: "www.google.com.ar" })).toBe("google");
    expect(canalDeOrigen({ ...base, registroReferrer: "www.ejemplo.com" })).toBe("ejemplo.com");
  });

  it("distingue visita directa de cuenta sin datos", () => {
    expect(canalDeOrigen({ ...base, registroLanding: "/" })).toBe("directo");
    expect(canalDeOrigen(base)).toBe("sin datos");
  });
});
