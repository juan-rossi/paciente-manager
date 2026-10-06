const PRODUCCION = "https://semio360.com";

// URL pública del sitio (sin barra final). Sale de NEXT_PUBLIC_SITE_URL para
// que QA (qa.semio360.com) arme canonicals, sitemap y og:image con su propio
// host en vez de apuntar a producción.
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (raw || PRODUCCION).replace(/\/+$/, "");
}

// Solo producción se indexa: cualquier otro entorno (QA, previews, local) se
// bloquea para buscadores y bots de IA.
export function esProduccion(): boolean {
  return getSiteUrl() === PRODUCCION;
}

export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function fotoDoctorPath(slug: string): string {
  return `/api/directorio/${encodeURIComponent(slug)}/foto`;
}
