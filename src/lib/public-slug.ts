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
