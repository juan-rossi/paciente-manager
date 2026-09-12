// Cualquier entorno de médico deployado sigue el patrón "paciente-manager" o
// "paciente-manager-<slug-del-médico>" en Vercel (ver ENTORNOS.md/onboard-doctor),
// o vive en un subdominio de "malvinasoftware.com" (dominio propio de la
// organización, usado para los médicos que tienen su propia URL en vez de
// la de Vercel — ver ENTORNOS.md). Confiamos en estos patrones completos en
// vez de exigir que cada instalación tenga el dominio exacto de SU médico en
// `allowedOrigins` — así un mismo instalador sirve para cualquier médico
// nuevo, tenga URL de Vercel o dominio propio, sin que haga falta
// reconfigurar nada a mano.
const KNOWN_DEPLOYMENT_PATTERNS = [
  /^https:\/\/paciente-manager(-[a-z0-9]+)*\.vercel\.app$/i,
  /^https:\/\/([a-z0-9-]+\.)*malvinasoftware\.com$/i,
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
