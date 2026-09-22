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
}): Omit<DoctorPublico, "distanciaKm" | "ciudades" | "lugarIdMasCercano"> {
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
  // La ciudad "relevante" para mostrar: la del punto que matcheó una
  // búsqueda por ubicación, o la del perfil si no hay búsqueda activa.
  ciudad: string | null;
  // Todas las ciudades distintas donde atiende (perfil + lugares con
  // `ciudad` cargada) -- sin una búsqueda por ubicación activa, la tarjeta
  // las muestra todas en vez de solo la del perfil, para que un médico que
  // atiende en más de una ciudad no parezca que solo atiende en una.
  ciudades: string[];
  biografia: string | null;
  fotoPerfilBase64: string | null;
  reservaPublicaHabilitada: boolean;
  distanciaKm: number | null;
  // El `LugarDeTrabajo` que matcheó la búsqueda por ubicación (`null` si
  // matcheó por el perfil, o si no hubo búsqueda activa) -- se propaga como
  // query param al link "Ver perfil" (ver DoctorCard) para que el
  // calendario de reserva pública arranque con ese lugar destacado.
  lugarIdMasCercano: string | null;
};

function ciudadesDe(doctor: { ciudad: string | null; lugaresDeTrabajo: { ciudad: string | null }[] }): string[] {
  const ciudades = new Set<string>();
  if (doctor.ciudad) ciudades.add(doctor.ciudad);
  for (const lugar of doctor.lugaresDeTrabajo) {
    if (lugar.ciudad) ciudades.add(lugar.ciudad);
  }
  return [...ciudades];
}

// Radio máximo para considerar un médico "de la zona" al buscar por ciudad --
// sin este corte, una búsqueda sin resultados cercanos terminaba mostrando
// igual al médico menos lejano del país entero (p.ej. a 800km), lo cual
// confunde más de lo que ayuda. Cubre una ciudad más su área metropolitana;
// por fuera de eso, mejor no mostrar nada que mostrar algo irrelevante.
const RADIO_MAXIMO_KM = 50;

type Punto = { latitud: number; longitud: number; ciudad: string | null; lugarId: string | null };

function tienePunto(p: {
  latitud: number | null;
  longitud: number | null;
  ciudad: string | null;
  lugarId: string | null;
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
        select: { id: true, latitud: true, longitud: true, ciudad: true },
      },
    },
    orderBy: { apellido: "asc" },
  });

  if (!buscandoPorUbicacion) {
    return doctores.map((doctor) => ({
      ...pickDoctorPublico(doctor),
      ciudades: ciudadesDe(doctor),
      distanciaKm: null,
      lugarIdMasCercano: null,
    }));
  }

  return doctores
    .map((doctor) => {
      const ciudades = ciudadesDe(doctor);
      const puntos = [
        { latitud: doctor.latitud, longitud: doctor.longitud, ciudad: doctor.ciudad, lugarId: null as string | null },
        ...doctor.lugaresDeTrabajo.map((l) => ({
          latitud: l.latitud,
          longitud: l.longitud,
          ciudad: l.ciudad,
          lugarId: l.id as string | null,
        })),
      ].filter(tienePunto);

      if (puntos.length === 0) {
        return { ...pickDoctorPublico(doctor), ciudades, distanciaKm: null, lugarIdMasCercano: null };
      }

      // La ciudad que se muestra es la del punto que efectivamente matcheó
      // (perfil o alguno de los lugares), no siempre la del perfil -- si no,
      // un médico que aparece por un consultorio en otra ciudad mostraría
      // "Bariloche · a 0 m" al buscar en Buenos Aires, lo cual es
      // contradictorio. `lugarId` viaja junto para poder destacar ese mismo
      // lugar en el calendario de reserva del perfil (ver DoctorCard).
      const masCercano = puntos
        .map((p) => ({
          ciudad: p.ciudad,
          lugarId: p.lugarId,
          distanciaKm: distanciaKm(filtros.lat!, filtros.lng!, p.latitud, p.longitud),
        }))
        .reduce((min, p) => (p.distanciaKm < min.distanciaKm ? p : min));

      return {
        ...pickDoctorPublico(doctor),
        // Ojo: NO cae a `doctor.ciudad` si el punto que matcheó no tiene su
        // propia ciudad cargada -- eso mezclaría la ciudad de un lugar con
        // la distancia de otro (ej. un lugar en San Luis sin `ciudad`
        // cargada mostrando "Corrientes", la ciudad del perfil, a pesar de
        // que la distancia sí es la de San Luis).
        ciudad: masCercano.ciudad,
        ciudades,
        distanciaKm: masCercano.distanciaKm,
        lugarIdMasCercano: masCercano.lugarId,
      };
    })
    .filter((doctor): doctor is DoctorPublico & { distanciaKm: number } => doctor.distanciaKm !== null)
    .filter((doctor) => doctor.distanciaKm <= RADIO_MAXIMO_KM)
    .sort((a, b) => a.distanciaKm - b.distanciaKm);
}

// Alcanzable con `perfilPublico: false` si el médico igual habilitó la
// reserva pública -- ese caso no aparece en el listado del directorio (ver
// `getDoctoresPublicos`, que sigue filtrando por `perfilPublico`), pero el
// link directo a su agenda (compartido a mano, no descubierto navegando)
// tiene que seguir funcionando. El componente oculta la sección "Sobre mí"
// en ese caso -- ver `doctor.perfilPublico` en la página.
export async function getDoctorPublicoPorSlug(slug: string) {
  return prisma.user.findFirst({
    where: {
      role: "DOCTOR",
      publicSlug: slug,
      OR: [{ perfilPublico: true }, { reservaPublicaHabilitada: true }],
    },
    select: {
      ...doctorPublicoSelect,
      perfilPublico: true,
      atencionTipo: true,
      nombreConsultorio: true,
      telefono: true,
      direccion: true,
      lugaresDeTrabajo: {
        where: { deletedAt: null },
        select: { id: true, tipo: true, nombre: true, ciudad: true, direccion: true, telefono: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
