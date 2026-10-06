import { TITULO_CORTESIA_LABELS, type TituloCortesia } from "@/lib/titulo-cortesia";

export type GeneroPlaca = "MASCULINO" | "FEMENINO";

const TITULOS_FEMENINOS: TituloCortesia[] = ["DRA", "BIOQCA", "KLGA"];
const TITULOS_MASCULINOS: TituloCortesia[] = ["DR", "BIOQ", "KLGO"];

// El perfil del médico no guarda el sexo, solo el título. Con "Dra." o
// "Klgo." se sabe; con "Lic.", "Psic.", "Méd.", "Odont." o "Enf." no -- ahí
// devuelve null y el admin lo elige a mano antes de publicar.
export function generoDeTitulo(titulo: TituloCortesia | null): GeneroPlaca | null {
  if (!titulo) return null;
  if (TITULOS_FEMENINOS.includes(titulo)) return "FEMENINO";
  if (TITULOS_MASCULINOS.includes(titulo)) return "MASCULINO";
  return null;
}

export function palabraBienvenida(genero: GeneroPlaca | null): string {
  if (genero === "FEMENINO") return "Bienvenida";
  if (genero === "MASCULINO") return "Bienvenido";
  return "Bienvenido/a";
}

export function nombreConTitulo(d: {
  tituloCortesia: TituloCortesia | null;
  nombre: string;
  apellido: string;
}): string {
  const nombre = `${d.nombre} ${d.apellido}`.trim();
  return d.tituloCortesia ? `${TITULO_CORTESIA_LABELS[d.tituloCortesia]} ${nombre}` : nombre;
}

function unirCiudades(ciudades: string[]): string {
  if (ciudades.length <= 1) return ciudades.join("");
  return `${ciudades.slice(0, -1).join(", ")} y ${ciudades[ciudades.length - 1]}`;
}

type TextoInput = {
  nombreCompleto: string;
  especialidad: string;
  ciudades: string[];
  agendaVirtual: boolean;
  url: string;
  genero: GeneroPlaca | null;
};

// Texto que acompaña la placa en la publicación. Con agenda virtual invita a
// reservar; sin ella manda al perfil del directorio.
export function textoBienvenida(d: TextoInput): string {
  const articulo = d.genero === "FEMENINO" ? "a la" : d.genero === "MASCULINO" ? "al" : "a";
  const lugares = d.ciudades.length > 0 ? `, atiende en ${unirCiudades(d.ciudades)}` : "";
  const encontrar = d.genero === "FEMENINO" ? "Encontrala" : "Encontralo";
  const cierre = d.agendaVirtual
    ? `Ya podés reservar tu turno online:\n${d.url}`
    : `${encontrar} en nuestro directorio:\n${d.url}`;

  return (
    `Hoy le damos la bienvenida ${articulo} ${d.nombreCompleto} a Semio360.\n\n` +
    `Especialista en ${d.especialidad.toLowerCase()}${lugares}.\n\n` +
    `${cierre}\n\n` +
    `#Semio360 #Bienvenidos #Salud`
  );
}
