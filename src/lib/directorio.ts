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

function pickDoctorPublico(row: {
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
}): Omit<DoctorPublico, "distanciaKm"> {
  return {
    id: row.id,
    publicSlug: row.publicSlug,
    tituloCortesia: row.tituloCortesia,
    nombre: row.nombre,
    apellido: row.apellido,
    especialidad: row.especialidad,
    ciudad: row.ciudad,
    biografia: row.biografia,
    fotoPerfilBase64: row.fotoPerfilBase64,
    reservaPublicaHabilitada: row.reservaPublicaHabilitada,
  };
}

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

type Punto = { latitud: number; longitud: number; ciudad: string | null };

function tienePunto(p: {
  latitud: number | null;
  longitud: number | null;
  ciudad: string | null;
}): p is Punto {
  return p.latitud != null && p.longitud != null;
}

// Listado del directorio -- solo médicos que habilitaron "Perfil público" en
// Mi Perfil, y solo los que ya tienen `publicSlug` (se genera al activar el
// toggle, ver `src/app/api/perfil/route.ts`).
//
// Cuando se busca por ciudad (lat/lng de la ciudad elegida en el
// autocompletado, ver `CiudadAutocomplete`), el filtro no es un match exacto
// de texto: se ordena por distancia real, se descartan los que quedan a más
// de `RADIO_MAXIMO_KM`, y se excluyen los médicos sin ningún punto ubicable.
// Un médico puede atender en varios `LugarDeTrabajo` además de la dirección
// de su perfil (potencialmente en ciudades distintas) -- la distancia que
// cuenta es la del punto más cercano de TODOS los que tiene, no solo la de
// su perfil, así que la búsqueda no filtra por `User.latitud`/`longitud` en
// la query: trae todos los candidatos y calcula en memoria contra el
// conjunto {perfil, lugares activos}. Sin ciudad, se listan todos
// alfabéticamente.
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
    },
    select: {
      ...doctorPublicoSelect,
      latitud: true,
      longitud: true,
      lugaresDeTrabajo: {
        where: { deletedAt: null },
        select: { latitud: true, longitud: true, ciudad: true },
      },
    },
    orderBy: { apellido: "asc" },
  });

  if (!buscandoPorUbicacion) {
    return doctores.map((doctor) => ({ ...pickDoctorPublico(doctor), distanciaKm: null }));
  }

  return doctores
    .map((doctor) => {
      const puntos = [
        { latitud: doctor.latitud, longitud: doctor.longitud, ciudad: doctor.ciudad },
        ...doctor.lugaresDeTrabajo,
      ].filter(tienePunto);

      if (puntos.length === 0) {
        return { ...pickDoctorPublico(doctor), distanciaKm: null };
      }

      // La ciudad que se muestra es la del punto que efectivamente matcheó
      // (perfil o alguno de los lugares), no siempre la del perfil -- si no,
      // un médico que aparece por un consultorio en otra ciudad mostraría
      // "Bariloche · a 0 m" al buscar en Buenos Aires, lo cual es
      // contradictorio.
      const masCercano = puntos
        .map((p) => ({ ciudad: p.ciudad, distanciaKm: distanciaKm(filtros.lat!, filtros.lng!, p.latitud, p.longitud) }))
        .reduce((min, p) => (p.distanciaKm < min.distanciaKm ? p : min));

      return {
        ...pickDoctorPublico(doctor),
        // Ojo: NO cae a `doctor.ciudad` si el punto que matcheó no tiene su
        // propia ciudad cargada -- eso mezclaría la ciudad de un lugar con
        // la distancia de otro (ej. un lugar en San Luis sin `ciudad`
        // cargada mostrando "Corrientes", la ciudad del perfil, a pesar de
        // que la distancia sí es la de San Luis).
        ciudad: masCercano.ciudad,
        distanciaKm: masCercano.distanciaKm,
      };
    })
    .filter((doctor): doctor is DoctorPublico & { distanciaKm: number } => doctor.distanciaKm !== null)
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
