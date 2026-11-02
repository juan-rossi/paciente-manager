import { prisma } from "@/lib/prisma";
import type { ModeracionCampo } from "@/generated/prisma/client";

// Moderación del perfil público: antes de que una foto o biografía nueva se
// vea en el directorio, pasa por la API de moderación de OpenAI (gratuita;
// marca desnudos, violencia, insultos, odio, etc.). Si la aprueba, se copia a
// `fotoPublicaBase64`/`biografiaPublica`; si la marca -- o si la API no
// responde --, queda un `ModeracionPerfil` PENDIENTE para /admin/moderacion y
// el público sigue viendo la versión anterior hasta que un admin decida.

const OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations";
const TIMEOUT_MS = 10_000;

type ResultadoModeracion =
  | { estado: "ok" }
  | { estado: "marcado"; categorias: string[] }
  | { estado: "error" };

// La API de OpenAI agarra insultos e incitación al odio, pero no la
// vulgaridad suelta, y menos el lunfardo ("me gusta la garcha" le da ~0,05 de
// acoso). Esta lista la complementa para la biografía: si aparece alguna, va
// directo a revisión. Un falso positivo (p.ej. el apellido "Concha") solo le
// cuesta un clic al admin. Se compara sin tildes y en minúscula, por palabra
// completa.
const PALABRAS_VULGARES = new RegExp(
  "\\b(" +
    [
      "garch\\w*",
      "pijas?",
      "pijud\\w*",
      "poronga\\w*",
      "vergas?",
      "chot[oa]s?",
      "conchas?",
      "conchud\\w*",
      "pelotud\\w*",
      "bolud\\w*",
      "forr[oa]s?",
      "mierda\\w*",
      "cag(ar|o|a|ue|on|ad\\w*|ando)",
      "culos?",
      "culia\\w*",
      "orto",
      "ojete",
      "sorete\\w*",
      "cog(er|ido|io|iendo|e|en|eme|ete)",
      "follar\\w*",
      "put[oa]s?",
      "putit[oa]s?",
      "hdp",
      "trol[oa]s?",
      "maric\\w*",
      "carajo",
      "jod(er|ete|ido)",
      "pete(ro|ra|s)?",
      "chupa(la|me|mela|pija)",
      "tetas?",
      "pajer[oa]s?",
      "mamada",
      "idiota\\w*",
      "imbecil\\w*",
      "estupid[oa]s?",
      "tarad[oa]s?",
      "mogolic[oa]s?",
    ].join("|") +
    ")\\b"
);

function tieneLenguajeVulgar(texto: string): boolean {
  const normalizado = texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return PALABRAS_VULGARES.test(normalizado);
}

async function moderar(campo: ModeracionCampo, contenido: string): Promise<ResultadoModeracion> {
  if (campo === "BIOGRAFIA" && tieneLenguajeVulgar(contenido)) {
    return { estado: "marcado", categorias: ["vulgar"] };
  }
  return moderarConApi(campo, contenido);
}

async function moderarConApi(campo: ModeracionCampo, contenido: string): Promise<ResultadoModeracion> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[moderacion] Falta OPENAI_API_KEY");
    return { estado: "error" };
  }

  // La foto se guarda como data URL, que la API acepta tal cual.
  const input =
    campo === "FOTO" ? [{ type: "image_url", image_url: { url: contenido } }] : contenido;

  try {
    const res = await fetch(OPENAI_MODERATION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "omni-moderation-latest", input }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("[moderacion] La API respondió", res.status, await res.text().catch(() => ""));
      return { estado: "error" };
    }
    const data = (await res.json()) as {
      results?: { flagged: boolean; categories: Record<string, boolean> }[];
    };
    const resultado = data.results?.[0];
    if (!resultado) return { estado: "error" };
    if (!resultado.flagged) return { estado: "ok" };
    return {
      estado: "marcado",
      categorias: Object.entries(resultado.categories)
        .filter(([, marcada]) => marcada)
        .map(([categoria]) => categoria),
    };
  } catch (error) {
    console.error("[moderacion] Error llamando a la API", error);
    return { estado: "error" };
  }
}

// Categorías de `omni-moderation-latest`, para mostrarle al admin por qué se
// marcó. Una que no esté acá (si OpenAI agrega alguna) se muestra tal cual.
export const CATEGORIA_LABELS: Record<string, string> = {
  // Propia, no de la API: ver `PALABRAS_VULGARES`.
  vulgar: "Lenguaje vulgar",
  sexual: "Contenido sexual",
  "sexual/minors": "Sexual con menores",
  harassment: "Acoso o insultos",
  "harassment/threatening": "Amenazas",
  hate: "Odio",
  "hate/threatening": "Odio con amenazas",
  illicit: "Actividad ilícita",
  "illicit/violent": "Actividad ilícita violenta",
  "self-harm": "Autolesión",
  "self-harm/intent": "Autolesión",
  "self-harm/instructions": "Autolesión",
  violence: "Violencia",
  "violence/graphic": "Violencia explícita",
};

export type EstadoModeracion = "publicado" | "pendiente" | "rechazado";

const CAMPOS = {
  BIOGRAFIA: { propio: "biografia", publico: "biografiaPublica" },
  FOTO: { propio: "fotoPerfilBase64", publico: "fotoPublicaBase64" },
} as const;

// Lleva lo que el médico cargó en `campo` a su versión pública, pasando por la
// moderación solo si hace falta. Se llama después de guardar el campo, o de
// hacer público el perfil: compara contra lo ya publicado, así que lo que no
// cambió nunca se vuelve a mandar a la API. Devuelve `null` si el campo
// todavía no se muestra en ningún lado público (la moderación se hace recién
// al publicarlo).
export async function sincronizarCampoPublico(
  userId: string,
  campo: ModeracionCampo
): Promise<EstadoModeracion | null> {
  const { propio, publico } = CAMPOS[campo];
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      perfilPublico: true,
      reservaPublicaHabilitada: true,
      biografia: true,
      biografiaPublica: true,
      fotoPerfilBase64: true,
      fotoPublicaBase64: true,
    },
  });

  // La biografía solo sale en el perfil público; la foto también en la
  // agenda pública (ver `getDoctorPublicoPorSlug`).
  const expuesto =
    campo === "BIOGRAFIA" ? user.perfilPublico : user.perfilPublico || user.reservaPublicaHabilitada;
  if (!expuesto) return null;

  const actual = user[propio];
  const pendienteWhere = { userId, campo, estado: "PENDIENTE" } as const;

  // Sin cambios respecto de lo publicado, o el médico quitó el contenido
  // (sacar algo nunca necesita revisión): se publica directo y cualquier
  // revisión pendiente de ese campo pierde sentido.
  if (actual === user[publico] || !actual?.trim()) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { [publico]: actual } }),
      prisma.moderacionPerfil.deleteMany({ where: pendienteWhere }),
    ]);
    return "publicado";
  }

  // Ya está en la cola o un admin ya lo rechazó: no se vuelve a mandar.
  const previa = await prisma.moderacionPerfil.findFirst({
    where: { userId, campo, contenido: actual, estado: { in: ["PENDIENTE", "RECHAZADA"] } },
    orderBy: { updatedAt: "desc" },
    select: { estado: true },
  });
  if (previa) {
    // Volver a un contenido ya rechazado deja de lado el pendiente de otro.
    if (previa.estado === "RECHAZADA") await prisma.moderacionPerfil.deleteMany({ where: pendienteWhere });
    return previa.estado === "PENDIENTE" ? "pendiente" : "rechazado";
  }

  const resultado = await moderar(campo, actual);

  if (resultado.estado === "ok") {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { [publico]: actual } }),
      prisma.moderacionPerfil.deleteMany({ where: pendienteWhere }),
    ]);
    return "publicado";
  }

  const revision = {
    contenido: actual,
    motivo: resultado.estado === "marcado" ? ("MARCADO" as const) : ("API_NO_DISPONIBLE" as const),
    categorias: resultado.estado === "marcado" ? resultado.categorias : [],
  };
  const existente = await prisma.moderacionPerfil.findFirst({ where: pendienteWhere, select: { id: true } });
  if (existente) {
    await prisma.moderacionPerfil.update({ where: { id: existente.id }, data: revision });
  } else {
    await prisma.moderacionPerfil.create({ data: { userId, campo, ...revision } });
  }
  return "pendiente";
}

// Estado de lo que el médico tiene cargado hoy en cada campo, para avisarle en
// Configuración si todavía no se ve en su perfil público. `null` = nada que
// avisar (ya publicado, o el campo no es público).
export async function getEstadoModeracionPerfil(userId: string): Promise<{
  biografia: Exclude<EstadoModeracion, "publicado"> | null;
  foto: Exclude<EstadoModeracion, "publicado"> | null;
}> {
  const [user, revisiones] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { biografia: true, fotoPerfilBase64: true },
    }),
    prisma.moderacionPerfil.findMany({
      where: { userId, estado: { in: ["PENDIENTE", "RECHAZADA"] } },
      select: { campo: true, estado: true, contenido: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  function estadoDe(campo: ModeracionCampo, actual: string | null) {
    const revision = revisiones.find((r) => r.campo === campo && r.contenido === actual);
    if (!revision) return null;
    return revision.estado === "PENDIENTE" ? "pendiente" : "rechazado";
  }

  return {
    biografia: estadoDe("BIOGRAFIA", user.biografia),
    foto: estadoDe("FOTO", user.fotoPerfilBase64),
  };
}
