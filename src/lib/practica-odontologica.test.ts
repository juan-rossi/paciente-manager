import { describe, expect, it } from "vitest";
import {
  filtrarPracticas,
  ordenarCaras,
  practicaVisitaInputSchema,
  type PracticaCatalogo,
} from "./practica-odontologica";

const p = (codigo: string, descripcion: string, capitulo: number, subgrupo: string | null = null) =>
  ({ id: codigo, codigo, descripcion, capitulo, subgrupo }) satisfies PracticaCatalogo;

const CATALOGO = [
  p("02.01", "Obturación con amalgama. Cavidad simple", 2),
  p("02.08", "Restauración con material estético", 2),
  p("04.01.04", "Corona colada", 4, "Prótesis fija"),
  p("04.01.05", "Corona colada con frente estético", 4, "Prótesis fija"),
  p("10.01", "Extracción dentaria", 10),
];

const codigos = (q: string) => filtrarPracticas(CATALOGO, q).map((r) => r.codigo);

describe("filtrarPracticas", () => {
  it("sin búsqueda devuelve todo", () => {
    expect(codigos("  ")).toHaveLength(CATALOGO.length);
  });

  it("busca por prefijo de código con o sin puntos", () => {
    expect(codigos("02.08")).toEqual(["02.08"]);
    expect(codigos("0208")).toEqual(["02.08"]);
    expect(codigos("0401")).toEqual(["04.01.04", "04.01.05"]);
    expect(codigos("02")).toEqual(["02.01", "02.08"]);
  });

  it("busca palabras sueltas en la descripción sin acentos ni mayúsculas", () => {
    expect(codigos("extraccion")).toEqual(["10.01"]);
    expect(codigos("CORONA estetico")).toEqual(["04.01.05"]);
    expect(codigos("estético")).toEqual(["02.08", "04.01.05"]);
  });

  it("también busca en el subgrupo", () => {
    expect(codigos("protesis fija")).toEqual(["04.01.04", "04.01.05"]);
  });
});

describe("practicaVisitaInputSchema", () => {
  it("acepta pieza FDI con caras y boca completa sin caras", () => {
    expect(practicaVisitaInputSchema.safeParse({ practicaId: "x", pieza: "36", caras: ["O", "D"] }).success).toBe(true);
    expect(practicaVisitaInputSchema.safeParse({ practicaId: "x", pieza: null }).success).toBe(true);
  });

  it("rechaza piezas inexistentes y caras sin pieza", () => {
    expect(practicaVisitaInputSchema.safeParse({ practicaId: "x", pieza: "19", caras: [] }).success).toBe(false);
    expect(practicaVisitaInputSchema.safeParse({ practicaId: "x", pieza: null, caras: ["O"] }).success).toBe(false);
  });
});

describe("ordenarCaras", () => {
  it("devuelve las caras en orden O V L M D", () => {
    expect(ordenarCaras(["D", "O", "M"])).toEqual(["O", "M", "D"]);
  });
});
