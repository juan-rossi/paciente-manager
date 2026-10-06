import { prisma } from "@/lib/prisma";

export function slugifyNombre(nombre: string, apellido: string): string {
  const base = `${nombre} ${apellido}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return base || "medico";
}

function slugifyTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Segmento de URL de un lugar de atención (`/directorio/{slug}/{lugarSlug}`).
// Es único por médico, contando también los lugares dados de baja (un link
// viejo nunca tiene que pasar a apuntar a otro lugar).
function generateUniqueLugarSlug(nombre: string | null, tomados: Set<string>): string {
  const base = slugifyTexto(nombre ?? "") || "consulta-particular";
  let slug = base;
  let suffix = 1;
  while (tomados.has(slug)) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  tomados.add(slug);
  return slug;
}

// Idempotente: completa el `publicSlug` de los lugares que todavía no lo
// tienen (los creados antes de que existiera el link por lugar). Se llama al
// cargar Configuración, que es el único lugar donde el médico ve esos links.
export async function ensureLugarSlugs(userId: string): Promise<void> {
  const lugares = await prisma.lugarDeTrabajo.findMany({
    where: { userId },
    select: { id: true, nombre: true, publicSlug: true },
    orderBy: { createdAt: "asc" },
  });
  const tomados = new Set(lugares.map((l) => l.publicSlug).filter((s): s is string => !!s));
  for (const lugar of lugares) {
    if (lugar.publicSlug) continue;
    const publicSlug = generateUniqueLugarSlug(lugar.nombre, tomados);
    await prisma.lugarDeTrabajo.update({ where: { id: lugar.id }, data: { publicSlug } });
  }
}

export async function slugParaLugarNuevo(userId: string, nombre: string | null): Promise<string> {
  const existentes = await prisma.lugarDeTrabajo.findMany({
    where: { userId },
    select: { publicSlug: true },
  });
  const tomados = new Set(existentes.map((l) => l.publicSlug).filter((s): s is string => !!s));
  return generateUniqueLugarSlug(nombre, tomados);
}

// Se llama una sola vez, cuando se habilita la agenda pública por primera
// vez -- después el slug queda fijo (ver comentario en el schema) así que
// nunca hace falta excluir al propio usuario de la búsqueda de colisión.
export async function generateUniquePublicSlug(nombre: string, apellido: string): Promise<string> {
  const base = slugifyNombre(nombre, apellido);
  let slug = base;
  let suffix = 1;
  while (await prisma.user.findFirst({ where: { publicSlug: slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}
