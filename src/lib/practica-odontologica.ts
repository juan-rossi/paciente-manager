import { z } from "zod";
import { CARAS, PIEZAS_VALIDAS, type Cara } from "@/lib/odontograma";

// Prácticas del Nomenclador Nacional de Prestaciones Odontológicas
// (PracticaOdontologica) y las que se cargan en cada visita del odontograma
// (OdontogramaPractica). Se usa en el cliente y en la API: no importa nada de
// servidor.

export const CAPITULOS: Record<number, string> = {
  1: "Consultas",
  2: "Operatoria dental",
  3: "Endodoncia",
  4: "Prótesis",
  5: "Odontología preventiva",
  6: "Ortodoncia",
  7: "Odontopediatría",
  8: "Periodoncia",
  9: "Radiología",
  10: "Cirugía",
};

const ROMANOS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function nombreCapitulo(capitulo: number) {
  return `${ROMANOS[capitulo] ?? capitulo} · ${CAPITULOS[capitulo] ?? "Otros"}`;
}

// Una fila del catálogo tal como la manda GET /api/practicas-odontologicas.
export type PracticaCatalogo = {
  id: string;
  codigo: string;
  descripcion: string;
  capitulo: number;
  subgrupo: string | null;
};

// Una práctica cargada en una visita.
export type PracticaVisita = {
  id: string;
  pieza: string | null;
  caras: Cara[];
  codigo: string;
  descripcion: string;
};

export function normalizarTexto(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// "0208", "02.08" o "4.01" buscan por código (prefijo, ignorando los puntos);
// cualquier otra cosa busca palabras sueltas en la descripción y el subgrupo,
// sin acentos ni mayúsculas ("corona colada" encuentra "Corona colada con
// frente estético").
export function esBusquedaPorCodigo(query: string) {
  return /^[\d.\s]+$/.test(query.trim());
}

export function filtrarPracticas<T extends PracticaCatalogo>(practicas: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return practicas;
  if (esBusquedaPorCodigo(q)) {
    const digitos = q.replace(/[.\s]/g, "");
    return practicas.filter((p) => p.codigo.replace(/\./g, "").startsWith(digitos));
  }
  const palabras = normalizarTexto(q).split(/\s+/).filter(Boolean);
  return practicas.filter((p) => {
    const texto = normalizarTexto(`${p.descripcion} ${p.subgrupo ?? ""}`);
    return palabras.every((w) => texto.includes(w));
  });
}

// Orden de las caras para mostrarlas siempre igual (O V L M D).
export function ordenarCaras(caras: readonly string[]): Cara[] {
  return CARAS.filter((c) => caras.includes(c));
}

export const practicaVisitaInputSchema = z
  .object({
    practicaId: z.string().min(1),
    pieza: z
      .string()
      .nullable()
      .refine((p) => p === null || PIEZAS_VALIDAS.has(p), "Pieza inválida."),
    caras: z.array(z.enum(CARAS)).max(CARAS.length).default([]),
  })
  .refine((d) => d.pieza !== null || d.caras.length === 0, {
    message: "Las caras solo se cargan con una pieza.",
    path: ["caras"],
  });

export type PracticaVisitaInput = z.infer<typeof practicaVisitaInputSchema>;

// Fila de Prisma (OdontogramaPractica) -> PracticaVisita.
export function practicaVisitaFromDb(p: {
  id: string;
  pieza: string | null;
  caras: string[];
  codigo: string;
  descripcion: string;
}): PracticaVisita {
  return {
    id: p.id,
    pieza: p.pieza,
    caras: ordenarCaras(p.caras),
    codigo: p.codigo,
    descripcion: p.descripcion,
  };
}
