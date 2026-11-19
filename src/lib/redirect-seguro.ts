// Destino post-login (`?from=`) que solo puede ser una ruta de NUESTRO sitio.
// Chequear `startsWith("/") && !startsWith("//")` no alcanza: `/\evil.com`
// pasa ese filtro y el navegador lo resuelve como `https://evil.com` (trata
// `\` como `/`). Se resuelve contra el origen actual, igual que lo haría el
// navegador, y se acepta solo si sigue siendo el mismo origen.
export function destinoInterno(from: string | null | undefined, origin: string): string | null {
  if (!from || !from.startsWith("/")) return null;
  // Caracteres de control/espacios: los navegadores los ignoran o recortan
  // al parsear y pueden cambiar cómo se interpreta la URL.
  if (/[\u0000-\u001f\u007f\s\\]/.test(from)) return null;
  let url: URL;
  try {
    url = new URL(from, origin);
  } catch {
    return null;
  }
  if (url.origin !== new URL(origin).origin) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
