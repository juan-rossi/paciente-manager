// Cualquier entorno de médico deployado sigue el patrón "paciente-manager" o
// "paciente-manager-<slug-del-médico>" en Vercel (ver ENTORNOS.md/onboard-doctor).
// Confiamos en el patrón completo en vez de exigir que cada instalación tenga
// el dominio exacto de SU médico en `allowedOrigins` — así un mismo instalador
// sirve para cualquier médico nuevo sin que haga falta reconfigurar nada a mano.
const KNOWN_DEPLOYMENT_PATTERN = /^https:\/\/paciente-manager(-[a-z0-9]+)*\.vercel\.app$/i;

/**
 * true si no hay Origin (cliente no-browser, ej. curl), si matchea el patrón de
 * despliegue conocido, o si está explícitamente en `allowedOrigins` (para
 * desarrollo local o un dominio propio no estándar).
 */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  if (KNOWN_DEPLOYMENT_PATTERN.test(origin)) return true;
  return allowedOrigins.includes(origin);
}
