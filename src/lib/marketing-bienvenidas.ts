import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ESPECIALIDAD_LABELS } from "@/lib/especialidad";
import { absoluteUrl } from "@/lib/site-url";
import {
  generoDeTitulo,
  nombreConTitulo,
  type GeneroPlaca,
} from "@/lib/marketing-bienvenidas-texto";

export type EstadoBienvenida = "pendientes" | "publicadas";

export type BienvenidaMedico = {
  id: string;
  nombreCompleto: string;
  especialidad: string;
  ciudades: string[];
  agendaVirtual: boolean;
  url: string;
  // Sugerido por el título (Dr./Dra.…); null si el título no lo define.
  generoSugerido: GeneroPlaca | null;
  // Con el que salió la placa; solo en las ya publicadas.
  genero: GeneroPlaca | null;
  altaAt: Date;
  publicadaAt: Date | null;
};

export type MedicoExcluido = { id: string; nombreCompleto: string; faltantes: string[] };

// Un médico entra a Bienvenidas cuando ya completó todo lo que lo hace
// presentable en redes: perfil completo (título, nombre, especialidad,
// matrícula), foto, biografía, perfil público y al menos un lugar de atención
// activo con horarios cargados.
const ELEGIBLE: Prisma.UserWhereInput = {
  role: "DOCTOR",
  perfilPublico: true,
  publicSlug: { not: null },
  tituloCortesia: { not: null },
  especialidad: { not: null },
  nombre: { not: "" },
  apellido: { not: "" },
  nroMatricula: { not: "" },
  fotoPerfilBase64: { not: null },
  biografia: { not: null },
  lugaresDeTrabajo: { some: { deletedAt: null, bloques: { some: {} } } },
};

const SELECT = {
  id: true,
  nombre: true,
  apellido: true,
  tituloCortesia: true,
  especialidad: true,
  biografia: true,
  ciudad: true,
  publicSlug: true,
  reservaPublicaHabilitada: true,
  createdAt: true,
  lugaresDeTrabajo: {
    where: { deletedAt: null },
    select: { ciudad: true, perfilVisible: true, reservaPublicaHabilitada: true, publicSlug: true },
  },
  marketingBienvenida: { select: { genero: true, publicadaAt: true } },
} satisfies Prisma.UserSelect;

type Fila = Prisma.UserGetPayload<{ select: typeof SELECT }>;

function aBienvenida(m: Fila): BienvenidaMedico {
  const lugares = m.lugaresDeTrabajo.filter((l) => l.perfilVisible);
  const ciudades = [...new Set(lugares.map((l) => l.ciudad).filter((c): c is string => !!c))];
  if (ciudades.length === 0 && m.ciudad) ciudades.push(m.ciudad);

  return {
    id: m.id,
    nombreCompleto: nombreConTitulo(m),
    especialidad: m.especialidad ? ESPECIALIDAD_LABELS[m.especialidad] : "",
    ciudades,
    agendaVirtual:
      m.reservaPublicaHabilitada &&
      lugares.some((l) => l.reservaPublicaHabilitada && !!l.publicSlug),
    url: absoluteUrl(`/directorio/${m.publicSlug}`),
    generoSugerido: generoDeTitulo(m.tituloCortesia),
    genero: m.marketingBienvenida?.genero ?? null,
    altaAt: m.createdAt,
    publicadaAt: m.marketingBienvenida?.publicadaAt ?? null,
  };
}

export async function getBienvenidas(estado: EstadoBienvenida): Promise<BienvenidaMedico[]> {
  if (estado === "publicadas") {
    const filas = await prisma.user.findMany({
      where: { role: "DOCTOR", marketingBienvenida: { isNot: null } },
      select: SELECT,
      orderBy: { marketingBienvenida: { publicadaAt: "desc" } },
    });
    return filas.map(aBienvenida);
  }

  const filas = await prisma.user.findMany({
    where: { ...ELEGIBLE, marketingBienvenida: { is: null } },
    select: SELECT,
    orderBy: { createdAt: "desc" },
  });
  // Una biografía de solo espacios no cuenta como completa.
  return filas.filter((m) => m.biografia?.trim()).map(aBienvenida);
}

export async function contarBienvenidas(): Promise<{ pendientes: number; publicadas: number }> {
  const [publicadas, pendientes] = await Promise.all([
    prisma.user.count({ where: { role: "DOCTOR", marketingBienvenida: { isNot: null } } }),
    getBienvenidas("pendientes").then((l) => l.length),
  ]);
  return { pendientes, publicadas };
}

const MAX_EXCLUIDOS = 15;

// Médicos que todavía no aparecen en la lista y qué les falta, para que el
// admin no tenga que adivinar por qué falta alguien. Los más nuevos primero.
export async function getExcluidos(): Promise<{ total: number; medicos: MedicoExcluido[] }> {
  const [medicos, conFoto] = await Promise.all([
    prisma.user.findMany({
      where: { role: "DOCTOR", marketingBienvenida: { is: null } },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        tituloCortesia: true,
        especialidad: true,
        nroMatricula: true,
        biografia: true,
        perfilPublico: true,
        lugaresDeTrabajo: {
          where: { deletedAt: null },
          select: { _count: { select: { bloques: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "DOCTOR", fotoPerfilBase64: { not: null } },
      select: { id: true },
    }),
  ]);
  const idsConFoto = new Set(conFoto.map((u) => u.id));

  const excluidos: MedicoExcluido[] = [];
  for (const m of medicos) {
    const faltantes: string[] = [];
    if (!m.perfilPublico) faltantes.push("Perfil no público");
    if (!m.tituloCortesia || !m.especialidad || !m.nroMatricula || !m.nombre || !m.apellido) {
      faltantes.push("Perfil incompleto");
    }
    if (!idsConFoto.has(m.id)) faltantes.push("Sin foto de perfil");
    if (!m.biografia?.trim()) faltantes.push("Sin biografía");
    if (!m.lugaresDeTrabajo.some((l) => l._count.bloques > 0)) faltantes.push("Sin lugar con horarios");
    if (faltantes.length > 0) {
      excluidos.push({ id: m.id, nombreCompleto: nombreConTitulo(m), faltantes });
    }
  }
  return { total: excluidos.length, medicos: excluidos.slice(0, MAX_EXCLUIDOS) };
}
