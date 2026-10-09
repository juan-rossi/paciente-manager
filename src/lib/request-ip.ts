// Acepta cualquier objeto con headers (un `NextRequest` de una ruta o el
// `Request` plano que Auth.js le pasa a `authorize()`).
// Vercel (y cualquier proxy delante de Next.js) manda la IP real del
// visitante en `x-forwarded-for` -- puede traer una cadena de varias IPs
// separadas por coma si hay más de un proxy en el medio (la primera es
// siempre la del cliente original). `x-real-ip` es el fallback más simple
// para el resto de los casos.
export function getClientIp(request: { headers: Headers }): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
