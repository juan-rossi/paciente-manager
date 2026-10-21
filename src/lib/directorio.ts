import { prisma } from "@/lib/prisma";
import type { Especialidad } from "@/lib/especialidad";
import type { TituloCortesia } from "@/lib/titulo-cortesia";
import { distanciaKm } from "@/lib/geo";
import { esActivo, isPremium } from "@/lib/plan";
import { fotoDoctorPath } from "@/lib/site-url";
import { formatDateParamBA } from "@/lib/timezone";
import { getDisponibilidadPublica } from "@/lib/public-booking";

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

// La reserva online solo se ofrece si el médico tiene la cuenta activa (trial
// o plan vigente, ver `esActivo`), aunque su agenda esté configurada como
// pública. Se calcula en cada consulta, nunca se guarda.
const cuentaSelect = { trialEndsAt: true, planEndsAt: true } as const;

// La foto se guarda como data URL en la fila; hacia afuera solo sale la ruta
// que la sirve como imagen real (cacheable e indexable), nunca el base64.
function fotoUrlDe(slug: string | null, base64: string | null): string | null {
  return slug && base64 ? fotoDoctorPath(slug) : null;
}

function pickDoctorPublico(row: {
  id: string;
  publicSlug: string | null;
  tituloCortesia: TituloCortesia | null;
  nombre: string;
  apellido: string;
  especialidad: Especialidad | null;
  ciudad: string | null;
  biografia: string | null;
  fotoPerfilBase64: string | null;
  reservaPublicaHabilitada: boolean;
  destacado: boolean;
  prepagas: { prepaga: { nombre: string } }[];
}): Omit<DoctorPublico, "distanciaKm" | "ciudades" | "lugarIdMasCercano" | "proximoTurno"> {
  return {
    id: row.id,
    publicSlug: row.publicSlug,
    tituloCortesia: row.tituloCortesia,
    nombre: row.nombre,
    apellido: row.apellido,
    especialidad: row.especialidad,
    ciudad: row.ciudad,
    biografia: row.biografia,
    fotoUrl: fotoUrlDe(row.publicSlug, row.fotoPerfilBase64),
    reservaPublicaHabilitada: row.reservaPublicaHabilitada,
    destacado: row.destacado,
    prepagas: row.destacado ? row.prepagas.map(({ prepaga }) => prepaga.nombre) : [],
  };
}

export type DoctorPublico = {
  id: string;
  publicSlug: string | null;
  tituloCortesia: TituloCortesia | null;
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
  fotoUrl: string | null;
  reservaPublicaHabilitada: boolean;
  // Beneficio de Premium: con el plan vigente (mismo criterio que el acceso a
  // la IA, `isPremium && esActivo`) el médico gana lugares en el listado (ver
  // `getDoctoresPublicos`) y su tarjeta sale ampliada, con el badge
  // "Destacado" (ver DoctorCard).
  destacado: boolean;
  // Coberturas que acepta y primer horario libre de su agenda pública (ISO) --
  // solo se calculan para los destacados, que son los únicos cuya tarjeta los
  // muestra: para el resto quedan en `[]` / `null`.
  prepagas: string[];
  proximoTurno: string | null;
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

// Al buscar por ciudad, la distancia de un destacado cuenta por este factor
// para ordenar: un Premium a 3 km compite como si estuviera a 1,5 km (le gana
// a un Básico a 2 km, no a uno a 800 m). El radio máximo se aplica siempre
// sobre la distancia real, y la tarjeta muestra la real.
const FACTOR_DISTANCIA_DESTACADO = 0.5;

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
//
// Los destacados (Premium vigente) ganan lugares: con búsqueda por ciudad,
// por `FACTOR_DISTANCIA_DESTACADO`; sin búsqueda, van todos primero, en un
// orden que rota cada día (ver `rotacionDelDia`) para que el alfabético no
// favorezca siempre al mismo.
export async function getDoctoresPublicos(filtros: {
  especialidad?: string;
  lat?: number;
  lng?: number;
}): Promise<DoctorPublico[]> {
  const buscandoPorUbicacion = filtros.lat != null && filtros.lng != null;

  const candidatos = await prisma.user.findMany({
    where: {
      role: "DOCTOR",
      perfilPublico: true,
      publicSlug: { not: null },
      // Sin prácticas visibles no hay dirección ni teléfono para mostrar, así
      // que el perfil no se publica aunque tenga el toggle activo (ver la
      // alerta en "Información pública" de Mi perfil).
      lugaresDeTrabajo: { some: { deletedAt: null, perfilVisible: true } },
      ...(filtros.especialidad ? { especialidad: filtros.especialidad as Especialidad } : {}),
    },
    select: {
      ...doctorPublicoSelect,
      ...cuentaSelect,
      plan: true,
      slotDurationMinutes: true,
      reservaPublicaSemanas: true,
      prepagas: {
        select: { prepaga: { select: { nombre: true } } },
        orderBy: { prepaga: { nombre: "asc" } },
      },
      latitud: true,
      longitud: true,
      lugaresDeTrabajo: {
        where: { deletedAt: null },
        select: {
          id: true,
          latitud: true,
          longitud: true,
          ciudad: true,
          perfilVisible: true,
          reservaPublicaHabilitada: true,
        },
      },
    },
    orderBy: { apellido: "asc" },
  });

  // Solo cuentan los lugares que el médico eligió mostrar: ciudades, distancia
  // y "Reserva online" salen de ahí, nunca de un lugar oculto. La ubicación
  // del perfil (`User.latitud`/`ciudad`, legado) se descarta si hay algún
  // lugar oculto, porque podría ser justo la de ese lugar.
  const doctores = candidatos.map((doctor) => {
    const visibles = doctor.lugaresDeTrabajo.filter((l) => l.perfilVisible);
    const activo = esActivo(doctor);
    return {
      ...doctor,
      lugaresDeTrabajo: visibles,
      ciudad: visibles.length === doctor.lugaresDeTrabajo.length ? doctor.ciudad : null,
      latitud: visibles.length === doctor.lugaresDeTrabajo.length ? doctor.latitud : null,
      longitud: visibles.length === doctor.lugaresDeTrabajo.length ? doctor.longitud : null,
      reservaPublicaHabilitada:
        activo &&
        doctor.reservaPublicaHabilitada &&
        visibles.some((l) => l.reservaPublicaHabilitada),
      destacado: activo && isPremium(doctor),
    };
  });

  const agendaPorId = new Map(candidatos.map((d) => [d.id, d]));
  return conProximoTurno(ordenar(), agendaPorId);

  function ordenar(): Omit<DoctorPublico, "proximoTurno">[] {
    if (!buscandoPorUbicacion) {
      const hoy = formatDateParamBA(new Date());
      // `sort` es estable: los no destacados quedan en el orden por apellido de
      // la query.
      return doctores
        .map((doctor) => ({
          ...pickDoctorPublico(doctor),
          ciudades: ciudadesDe(doctor),
          distanciaKm: null,
          lugarIdMasCercano: null,
        }))
        .sort(
          (a, b) =>
            Number(b.destacado) - Number(a.destacado) ||
            (a.destacado ? rotacionDelDia(a.id, hoy) - rotacionDelDia(b.id, hoy) : 0)
        );
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
      .filter(
        (doctor): doctor is Omit<DoctorPublico, "proximoTurno"> & { distanciaKm: number } =>
          doctor.distanciaKm !== null
      )
      .filter((doctor) => doctor.distanciaKm <= RADIO_MAXIMO_KM)
      .sort((a, b) => distanciaParaOrdenar(a) - distanciaParaOrdenar(b));
  }
}

function distanciaParaOrdenar(doctor: { destacado: boolean; distanciaKm: number }): number {
  return doctor.destacado ? doctor.distanciaKm * FACTOR_DISTANCIA_DESTACADO : doctor.distanciaKm;
}

// Orden pseudoaleatorio entre destacados, fijo durante el día (en horario de
// Argentina) y distinto al siguiente: hash FNV-1a de `día:id`. Así el mismo
// paciente ve el mismo orden si recarga, pero ningún Premium queda siempre
// último entre los destacados.
function rotacionDelDia(id: string, dia: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${dia}:${id}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// El "Próximo turno" de la tarjeta sale de la misma disponibilidad que ve el
// paciente en el calendario del perfil (`getDisponibilidadPublica`), así que
// nunca promete un horario que después no se puede reservar. Solo para
// destacados con reserva online, en paralelo.
async function conProximoTurno(
  doctores: Omit<DoctorPublico, "proximoTurno">[],
  agendaPorId: Map<string, { id: string; slotDurationMinutes: number; reservaPublicaSemanas: number }>
): Promise<DoctorPublico[]> {
  return Promise.all(
    doctores.map(async (doctor) => {
      const agenda = agendaPorId.get(doctor.id);
      if (!doctor.destacado || !doctor.reservaPublicaHabilitada || !agenda) {
        return { ...doctor, proximoTurno: null };
      }
      const dias = await getDisponibilidadPublica(agenda);
      const primero = dias.find((d) => d.horarios.length > 0)?.horarios[0];
      return { ...doctor, proximoTurno: primero?.inicio ?? null };
    })
  );
}

// Alcanzable con `perfilPublico: false` si el médico igual habilitó la
// reserva pública -- ese caso no aparece en el listado del directorio (ver
// `getDoctoresPublicos`, que sigue filtrando por `perfilPublico`), pero el
// link directo a su agenda (compartido a mano, no descubierto navegando)
// tiene que seguir funcionando. El componente oculta la sección "Sobre mí"
// en ese caso -- ver `doctor.perfilPublico` en la página.
export async function getDoctorPublicoPorSlug(slug: string) {
  const doctor = await prisma.user.findFirst({
    where: {
      role: "DOCTOR",
      publicSlug: slug,
      OR: [{ perfilPublico: true }, { reservaPublicaHabilitada: true }],
    },
    select: {
      ...doctorPublicoSelect,
      ...cuentaSelect,
      perfilPublico: true,
      whatsappComunidadUrl: true,
      instagramUrl: true,
      facebookUrl: true,
      tiktokUrl: true,
      youtubeUrl: true,
      atencionTipo: true,
      nombreConsultorio: true,
      telefono: true,
      direccion: true,
      prepagas: {
        select: { prepaga: { select: { id: true, nombre: true, nombreCompleto: true } } },
        orderBy: { prepaga: { nombre: "asc" } },
      },
      lugaresDeTrabajo: {
        where: { deletedAt: null },
        select: {
          id: true,
          tipo: true,
          nombre: true,
          ciudad: true,
          direccion: true,
          telefono: true,
          publicSlug: true,
          perfilVisible: true,
          reservaPublicaHabilitada: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!doctor) return null;

  const { trialEndsAt, planEndsAt, fotoPerfilBase64, ...resto } = doctor;
  const activo = esActivo({ trialEndsAt, planEndsAt });
  // Sin plan activo y sin perfil público, el link directo a la agenda deja de
  // ser un motivo para exponer la página.
  if (!activo && !resto.perfilPublico) return null;
  return {
    ...resto,
    fotoUrl: fotoUrlDe(resto.publicSlug, fotoPerfilBase64),
    reservaPublicaHabilitada: resto.reservaPublicaHabilitada && activo,
  };
}

// Slugs de los perfiles que se publican en el sitemap: los mismos que lista
// `getDoctoresPublicos` (perfil público activado y al menos un lugar visible).
export async function getSlugsPerfilesPublicos(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      role: "DOCTOR",
      perfilPublico: true,
      publicSlug: { not: null },
      lugaresDeTrabajo: { some: { deletedAt: null, perfilVisible: true } },
    },
    select: { publicSlug: true },
    orderBy: { apellido: "asc" },
  });
  return rows.map((r) => r.publicSlug!);
}
