/** true si no hay Origin (cliente no-browser, ej. curl) o si está en la lista permitida. */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}
