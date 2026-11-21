import { describe, expect, it } from "vitest";
import {
  aplicarFormato,
  estiloEn,
  parsearFormato,
  reemplazarRango,
  serializarTramos,
  textoPlano,
  tramosDe,
} from "./evolucion-formato";

describe("parsearFormato", () => {
  it("deja igual el texto sin marcas", () => {
    expect(parsearFormato("Sat 96% AA\nFc: 114")).toEqual(["Sat 96% AA\nFc: 114"]);
  });

  it("arma negrita, cursiva y color anidados", () => {
    expect(parsearFormato("Dx [c=rojo][b]sinusitis[/b][/c] y [i]más[/i]")).toEqual([
      "Dx ",
      { tipo: "c", color: "rojo", hijos: [{ tipo: "b", hijos: ["sinusitis"] }] },
      " y ",
      { tipo: "i", hijos: ["más"] },
    ]);
  });

  it("deja como texto las marcas sueltas, mal cerradas o desconocidas", () => {
    expect(textoPlano("a [b]sin cerrar")).toBe("a [b]sin cerrar");
    expect(textoPlano("a [/b] b")).toBe("a [/b] b");
    expect(textoPlano("[c=fucsia]x[/c]")).toBe("[c=fucsia]x[/c]");
    // Cruzadas: el [/b] dentro de la cursiva no cierra nada y el [b] queda abierto.
    expect(textoPlano("[b]a[i]b[/b]c[/i]")).toBe("[b]ab[/b]c");
  });
});

describe("textoPlano", () => {
  it("saca las marcas", () => {
    expect(textoPlano("[c=azul]amoxicilina [b]1 g[/b][/c] cada 12 hs")).toBe("amoxicilina 1 g cada 12 hs");
  });
});

describe("serializarTramos", () => {
  it("une tramos iguales y anida color > negrita > cursiva", () => {
    expect(
      serializarTramos([
        { texto: "Dx ", b: false, i: false, color: null },
        { texto: "sinu", b: true, i: false, color: "rojo" },
        { texto: "sitis", b: true, i: false, color: "rojo" },
        { texto: " ok", b: false, i: true, color: null },
      ])
    ).toBe("Dx [c=rojo][b]sinusitis[/b][/c][i] ok[/i]");
  });

  it("ida y vuelta conserva el texto y el formato", () => {
    const texto = "Hola [c=verde]mejor [b]hoy [i]sí[/i][/b][/c]\nPeso: 83.700";
    expect(serializarTramos(tramosDe(texto))).toBe(texto);
  });
});

describe("aplicarFormato", () => {
  const texto = "Dx de sinusitis. Peso: 83.700";

  it("pone y saca negrita en un rango", () => {
    const conB = aplicarFormato(texto, 6, 15, { tipo: "b" });
    expect(conB).toBe("Dx de [b]sinusitis[/b]. Peso: 83.700");
    expect(aplicarFormato(conB, 6, 15, { tipo: "b" })).toBe(texto);
  });

  it("si el rango está a medias en negrita, lo completa", () => {
    const parcial = "Dx de [b]sinu[/b]sitis";
    expect(aplicarFormato(parcial, 6, 15, { tipo: "b" })).toBe("Dx de [b]sinusitis[/b]");
  });

  it("pinta y vuelve a negro", () => {
    const rojo = aplicarFormato(texto, 0, 15, { tipo: "color", color: "rojo" });
    expect(rojo).toBe("[c=rojo]Dx de sinusitis[/c]. Peso: 83.700");
    expect(aplicarFormato(rojo, 6, 15, { tipo: "color", color: null })).toBe(
      "[c=rojo]Dx de [/c]sinusitis. Peso: 83.700"
    );
  });

  it("reporta el estilo del rango", () => {
    const t = "[c=azul][b]ab[/b]cd[/c]";
    expect(estiloEn(t, 0, 2)).toEqual({ b: true, i: false, color: "azul" });
    expect(estiloEn(t, 0, 4)).toEqual({ b: false, i: false, color: "azul" });
  });

  it("pega texto plano en el medio de un tramo con formato", () => {
    expect(reemplazarRango("[b]abcd[/b]", 2, 2, "XY")).toBe("[b]ab[/b]XY[b]cd[/b]");
  });
});
