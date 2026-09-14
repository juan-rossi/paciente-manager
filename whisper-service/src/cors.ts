// Entornos standalone del modelo anterior (uno por médico): siguen el patrón
// "paciente-manager" / "paciente-manager-<slug-del-médico>" en Vercel (ver
// ENTORNOS.md/onboard-doctor), o viven en un subdominio de
// "malvinasoftware.com" (dominio propio, usado por algunos médicos en vez de
// la URL de Vercel). Tras el pivot a SaaS multi-tenant, todos los médicos
// comparten en cambio el dominio único "semio360.com" (o el alias de Vercel
// "semio360*.vercel.app" cuando el nombre exacto ya está tomado). Confiamos
// en estos patrones completos en vez de exigir que cada instalación tenga el
// dominio exacto en `allowedOrigins` — así un mismo instalador sirve para
// cualquier médico, sin reconfigurar nada a mano.
const KNOWN_DEPLOYMENT_PATTERNS = [
  /^https:\/\/paciente-manager(-[a-z0-9]+)*\.vercel\.app$/i,
  /^https:\/\/([a-z0-9-]+\.)*malvinasoftware\.com$/i,
  /^https:\/\/semio360(-[a-z0-9]+)*\.vercel\.app$/i,
  /^https:\/\/([a-z0-9-]+\.)*semio360\.com$/i,
];

/**
 * true si no hay Origin (cliente no-browser, ej. curl), si matchea alguno de
 * los patrones de despliegue conocidos, o si está explícitamente en
 * `allowedOrigins` (para desarrollo local o un dominio fuera de esos patrones).
 */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  if (KNOWN_DEPLOYMENT_PATTERNS.some((pattern) => pattern.test(origin))) return true;
  return allowedOrigins.includes(origin);
}
