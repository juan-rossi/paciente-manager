// Verificación server-side del token de Cloudflare Turnstile que manda el
// widget del cliente (`src/components/marketing/turnstile-widget.tsx`)
// antes de confirmar una reserva pública. Nunca se confía en el cliente
// para esto -- el token en sí no prueba nada hasta que Cloudflare lo
// valida de este lado.
export async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Fail-closed en producción: sin la secret key configurada no hay
    // forma de verificar nada, así que se rechaza en vez de dejar pasar
    // reservas sin captcha (decisión explícita del usuario -- prefiere
    // que el directorio público quede bloqueado antes que desprotegido).
    // Fuera de producción (dev/preview sin configurar todavía) no bloquea
    // el flujo local.
    return process.env.NODE_ENV !== "production";
  }
  if (!token) return false;

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  if (!response.ok) return false;

  const data = (await response.json()) as { success?: boolean };
  return data.success === true;
}
