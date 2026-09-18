import { prisma } from "@/lib/prisma";
import type { Especialidad } from "@/lib/especialidad";

const doctorPublicoSelect = {
  id: true,
  publicSlug: true,
  tituloCortesia: true,
  nombre: true,
  apellido: true,
  especialidad: true,
  ciudad: true,
  biografia: true,
  fotoPerfilBase64: true,
  reservaPublicaHabilitada: true,
} as const;

export type DoctorPublico = {
  id: string;
  publicSlug: string | null;
  tituloCortesia: "DR" | "DRA" | "LIC" | null;
  nombre: string;
  apellido: string;
  especialidad: Especialidad | null;
  ciudad: string | null;
  biografia: string | null;
  fotoPerfilBase64: string | null;
  reservaPublicaHabilitada: boolean;
};

// Listado del directorio -- solo médicos que habilitaron "Perfil público" en
// Mi Perfil, y solo los que ya tienen `publicSlug` (se genera al activar el
// toggle, ver `src/app/api/perfil/route.ts`).
export async function getDoctoresPublicos(filtros: {
  especialidad?: string;
  ciudad?: string;
}): Promise<DoctorPublico[]> {
  return prisma.user.findMany({
    where: {
      role: "DOCTOR",
      perfilPublico: true,
      publicSlug: { not: null },
      ...(filtros.especialidad ? { especialidad: filtros.especialidad as Especialidad } : {}),
      ...(filtros.ciudad ? { ciudad: filtros.ciudad } : {}),
    },
    select: doctorPublicoSelect,
    orderBy: { apellido: "asc" },
  });
}

// Ciudades a mostrar en el filtro -- texto libre tal cual lo cargó cada
// médico (sin normalizar), así que dos médicos que escribieron la misma
// ciudad con mayúsculas distintas aparecen como opciones separadas.
export async function getCiudadesDisponibles(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { role: "DOCTOR", perfilPublico: true, publicSlug: { not: null }, ciudad: { not: null } },
    select: { ciudad: true },
    distinct: ["ciudad"],
    orderBy: { ciudad: "asc" },
  });
  return rows.map((r) => r.ciudad).filter((c): c is string => Boolean(c));
}

export async function getDoctorPublicoPorSlug(slug: string) {
  return prisma.user.findFirst({
    where: { role: "DOCTOR", perfilPublico: true, publicSlug: slug },
    select: {
      ...doctorPublicoSelect,
      atencionTipo: true,
      nombreConsultorio: true,
      telefono: true,
      direccion: true,
    },
  });
}
