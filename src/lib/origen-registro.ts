// De dónde llega un médico que se registra, para medir qué canal de
// marketing trae cuentas (ver la tarjeta "Origen de los registros" en
// /admin). Las páginas públicas y /signup guardan el origen en una cookie
// (ver `CapturaOrigen`) y el registro -- por formulario o con Google -- lo
// copia a la cuenta nueva. Sin Prisma acá: lo usa también el navegador.

export const ORIGEN_COOKIE = "semio_origen";
export const ORIGEN_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export type OrigenRegistro = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  registroReferrer?: string;
  registroLanding?: string;
};

const UTM_PARAMS = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
} as const;

const CAMPOS: (keyof OrigenRegistro)[] = [
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmContent",
  "registroReferrer",
  "registroLanding",
];

const MAX_LARGO = 120;

function limpiar(valor: string | null | undefined): string | undefined {
  const texto = valor?.trim().slice(0, MAX_LARGO);
  return texto ? texto : undefined;
}

// Qué guardar en la cookie para esta visita, o `null` para no tocarla. Un
// link con `utm_*` siempre pisa lo anterior (es la campaña que lo trajo esta
// vez); sin `utm_*` solo cuenta la primera visita, para que volver directo o
// desde Google días después no borre que llegó por un anuncio.
export function origenDeVisita(
  url: URL,
  referrer: string,
  cookieActual: string | undefined
): OrigenRegistro | null {
  const origen: OrigenRegistro = {};
  for (const [param, campo] of Object.entries(UTM_PARAMS)) {
    const valor = limpiar(url.searchParams.get(param));
    if (valor) origen[campo] = valor;
  }
  const tieneUtm = Object.keys(origen).length > 0;
  if (!tieneUtm && cookieActual) return null;

  try {
    const host = new URL(referrer).hostname;
    if (host && host !== url.hostname) origen.registroReferrer = limpiar(host);
  } catch {
    // Sin referrer (visita directa, app que no lo manda): queda vacío.
  }
  origen.registroLanding = limpiar(url.pathname);
  return origen;
}

export function serializarOrigen(origen: OrigenRegistro): string {
  return encodeURIComponent(JSON.stringify(origen));
}

// Lee la cookie tal como llega al server; ante cualquier valor raro devuelve
// un origen vacío -- nunca debe frenar un registro.
export function leerOrigenCookie(valor: string | undefined): OrigenRegistro {
  if (!valor) return {};
  let crudo: unknown;
  try {
    crudo = JSON.parse(valor);
  } catch {
    try {
      crudo = JSON.parse(decodeURIComponent(valor));
    } catch {
      return {};
    }
  }
  if (!crudo || typeof crudo !== "object") return {};
  const origen: OrigenRegistro = {};
  for (const campo of CAMPOS) {
    const v = (crudo as Record<string, unknown>)[campo];
    if (typeof v === "string") {
      const limpio = limpiar(v);
      if (limpio) origen[campo] = limpio;
    }
  }
  return origen;
}

// Canal con el que se agrupa una cuenta en /admin: el `utm_source` si vino
// con uno; si no, el sitio que la derivó (Instagram sin UTM es el link de la
// bio de un médico o un perfil sin etiquetar).
export function canalDeOrigen(user: {
  utmSource: string | null;
  registroReferrer: string | null;
  registroLanding: string | null;
}): string {
  if (user.utmSource) return user.utmSource.toLowerCase();
  const referrer = user.registroReferrer?.toLowerCase().replace(/^www\./, "");
  if (referrer) {
    if (referrer.includes("instagram")) return "instagram";
    if (referrer.includes("facebook") || referrer === "fb.com") return "facebook";
    if (/(^|\.)google\./.test(referrer)) return "google";
    return referrer;
  }
  // Ni UTM, ni referrer, ni página de entrada: la cuenta es anterior a esta
  // medición o el navegador bloqueó la cookie.
  return user.registroLanding ? "directo" : "sin datos";
}
