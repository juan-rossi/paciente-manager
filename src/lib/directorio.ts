import { prisma } from "@/lib/prisma";
import type { Especialidad } from "@/lib/especialidad";
import { distanciaKm } from "@/lib/geo";

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
  distanciaKm: number | null;
};

// Radio máximo para considerar un médico "de la zona" al buscar por ciudad --
// sin este corte, una búsqueda sin resultados cercanos terminaba mostrando
// igual al médico menos lejano del país entero (p.ej. a 800km), lo cual
// confunde más de lo que ayuda. Cubre una ciudad más su área metropolitana;
// por fuera de eso, mejor no mostrar nada que mostrar algo irrelevante.
const RADIO_MAXIMO_KM = 50;

// Listado del directorio -- solo médicos que habilitaron "Perfil público" en
// Mi Perfil, y solo los que ya tienen `publicSlug` (se genera al activar el
// toggle, ver `src/app/api/perfil/route.ts`).
//
// Cuando se busca por ciudad (lat/lng de la ciudad elegida en el
// autocompletado, ver `CiudadAutocomplete`), el filtro no es un match exacto
// de texto: se ordena por distancia real a las coordenadas del médico (que
// salen de su propia dirección geocodeada en Mi Perfil), se descartan los que
// quedan a más de `RADIO_MAXIMO_KM`, y se excluyen los médicos que todavía no
// cargaron una dirección, ya que no hay forma de ubicarlos. Sin ciudad, se
// listan todos alfabéticamente.
export async function getDoctoresPublicos(filtros: {
  especialidad?: string;
  lat?: number;
  lng?: number;
}): Promise<DoctorPublico[]> {
  const buscandoPorUbicacion = filtros.lat != null && filtros.lng != null;

  const doctores = await prisma.user.findMany({
    where: {
      role: "DOCTOR",
      perfilPublico: true,
      publicSlug: { not: null },
      ...(filtros.especialidad ? { especialidad: filtros.especialidad as Especialidad } : {}),
      ...(buscandoPorUbicacion ? { latitud: { not: null }, longitud: { not: null } } : {}),
    },
    select: { ...doctorPublicoSelect, latitud: true, longitud: true },
    orderBy: { apellido: "asc" },
  });

  if (!buscandoPorUbicacion) {
    return doctores.map((doctor) => ({ ...doctor, distanciaKm: null }));
  }

  return doctores
    .map(({ latitud, longitud, ...doctor }) => ({
      ...doctor,
      distanciaKm: distanciaKm(filtros.lat!, filtros.lng!, latitud!, longitud!),
    }))
    .filter((doctor) => doctor.distanciaKm <= RADIO_MAXIMO_KM)
    .sort((a, b) => a.distanciaKm - b.distanciaKm);
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
