// Redes del médico que se muestran en su perfil público (/directorio/[slug]).
// Se cargan en Configuración → Visibilidad y solo se exponen con
// `perfilPublico` activo. Se guardan ya normalizadas como URL completa: el
// médico puede pegar "@usuario" o el link tal cual lo copió de la app.

export const REDES_SOCIALES = ["whatsappComunidad", "instagram", "facebook", "tiktok", "youtube"] as const;

export type RedSocial = (typeof REDES_SOCIALES)[number];

export type RedesSociales = Record<RedSocial, string | null>;

// Columna de `User` donde se guarda cada red.
export const RED_SOCIAL_CAMPO = {
  whatsappComunidad: "whatsappComunidadUrl",
  instagram: "instagramUrl",
  facebook: "facebookUrl",
  tiktok: "tiktokUrl",
  youtube: "youtubeUrl",
} as const satisfies Record<RedSocial, string>;

export const RED_SOCIAL_LABELS: Record<RedSocial, string> = {
  whatsappComunidad: "Comunidad",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export const RED_SOCIAL_PLACEHOLDERS: Record<RedSocial, string> = {
  whatsappComunidad: "https://chat.whatsapp.com/…",
  instagram: "@usuario",
  facebook: "facebook.com/tu-pagina",
  tiktok: "@usuario",
  youtube: "youtube.com/@canal",
};

const ERRORES: Record<RedSocial, string> = {
  whatsappComunidad: "Pegá el link de invitación de la comunidad (chat.whatsapp.com/…).",
  instagram: "Ingresá un usuario (@usuario) o un link de instagram.com.",
  facebook: "Ingresá un link de facebook.com o el nombre de tu página.",
  tiktok: "Ingresá un usuario (@usuario) o un link de tiktok.com.",
  youtube: "Ingresá un canal (@canal) o un link de youtube.com.",
};

type Resultado = { ok: true; url: string | null } | { ok: false; error: string };

function parseUrl(valor: string): URL | null {
  try {
    const url = new URL(/^https?:\/\//i.test(valor) ? valor : `https://${valor}`);
    return url.hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

function esDominio(url: URL, ...dominios: string[]) {
  const host = url.hostname.toLowerCase();
  return dominios.some((d) => host === d || host.endsWith(`.${d}`));
}

// Primer segmento del path, sin "@" ni barras -- el usuario en
// instagram.com/usuario/ o tiktok.com/@usuario.
function primerSegmento(url: URL) {
  return url.pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "") ?? "";
}

function normalizar(red: RedSocial, valor: string): string | null {
  const handle = valor.replace(/^@/, "");
  const esHandle = !valor.includes("/") && !valor.includes(".com");

  switch (red) {
    case "instagram": {
      const usuario = esHandle ? handle : (() => {
        const url = parseUrl(valor);
        return url && esDominio(url, "instagram.com") ? primerSegmento(url) : "";
      })();
      return /^[A-Za-z0-9._]{1,30}$/.test(usuario) ? `https://www.instagram.com/${usuario}` : null;
    }
    case "tiktok": {
      const usuario = esHandle ? handle : (() => {
        const url = parseUrl(valor);
        return url && esDominio(url, "tiktok.com") ? primerSegmento(url) : "";
      })();
      return /^[A-Za-z0-9._]{2,24}$/.test(usuario) ? `https://www.tiktok.com/@${usuario}` : null;
    }
    case "facebook": {
      if (esHandle) return /^[A-Za-z0-9.]{5,50}$/.test(handle) ? `https://www.facebook.com/${handle}` : null;
      const url = parseUrl(valor);
      if (!url || !esDominio(url, "facebook.com", "fb.com") || url.pathname.length <= 1) return null;
      // `profile.php?id=…` necesita el query; el resto de los parámetros
      // suelen ser de tracking.
      const id = url.searchParams.get("id");
      return `https://www.facebook.com${url.pathname.replace(/\/$/, "")}${id ? `?id=${id}` : ""}`;
    }
    case "youtube": {
      if (esHandle) return /^[A-Za-z0-9._-]{3,30}$/.test(handle) ? `https://www.youtube.com/@${handle}` : null;
      const url = parseUrl(valor);
      if (!url || !esDominio(url, "youtube.com") || url.pathname.length <= 1) return null;
      return `https://www.youtube.com${url.pathname.replace(/\/$/, "")}`;
    }
    case "whatsappComunidad": {
      const url = parseUrl(valor);
      if (!url) return null;
      // Link de invitación a la comunidad/grupo, o un canal de WhatsApp.
      if (esDominio(url, "chat.whatsapp.com") && /^\/[A-Za-z0-9]{10,}\/?$/.test(url.pathname)) {
        return `https://chat.whatsapp.com${url.pathname.replace(/\/$/, "")}`;
      }
      if (esDominio(url, "whatsapp.com") && /^\/channel\/[A-Za-z0-9]{10,}\/?$/.test(url.pathname)) {
        return `https://whatsapp.com${url.pathname.replace(/\/$/, "")}`;
      }
      return null;
    }
  }
}

// Vacío → null (la red no se muestra). Lo usan tanto el form (para marcar el
// campo en el momento) como el schema del PATCH.
export function normalizarRedSocial(red: RedSocial, valor: string | null | undefined): Resultado {
  const limpio = (valor ?? "").trim();
  if (!limpio) return { ok: true, url: null };
  const url = normalizar(red, limpio);
  return url ? { ok: true, url } : { ok: false, error: ERRORES[red] };
}

// Lee las columnas de `User` y las devuelve con las claves de `RedSocial`.
export function redesDeUsuario(user: Record<(typeof RED_SOCIAL_CAMPO)[RedSocial], string | null>): RedesSociales {
  return Object.fromEntries(REDES_SOCIALES.map((red) => [red, user[RED_SOCIAL_CAMPO[red]]])) as RedesSociales;
}
