import { createHmac, timingSafeEqual } from "node:crypto";

// Link para darse de baja de los mails de activación sin iniciar sesión: va
// firmado con AUTH_SECRET para que nadie pueda dar de baja a otro médico
// adivinando su id. No vence (un link de baja viejo tiene que seguir andando).

function firma(doctorId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Falta AUTH_SECRET para firmar el link de baja.");
  return createHmac("sha256", secret).update(`engagement-baja:${doctorId}`).digest("base64url");
}

export function tokenBajaEngagement(doctorId: string): string {
  return firma(doctorId);
}

export function verificarTokenBajaEngagement(doctorId: string, token: string): boolean {
  if (!doctorId || !token) return false;
  const esperado = Buffer.from(firma(doctorId));
  const recibido = Buffer.from(token);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

// Página que muestra el botón de confirmación (el GET nunca da de baja: los
// antivirus de los mails abren los links solos).
export function urlPaginaBaja(baseUrl: string, doctorId: string): string {
  const qs = new URLSearchParams({ u: doctorId, t: tokenBajaEngagement(doctorId) });
  return `${baseUrl}/mails/baja?${qs}`;
}

// Endpoint del header `List-Unsubscribe` (baja de un clic, RFC 8058): Gmail y
// Yahoo le hacen POST directo.
export function urlApiBaja(baseUrl: string, doctorId: string): string {
  const qs = new URLSearchParams({ u: doctorId, t: tokenBajaEngagement(doctorId) });
  return `${baseUrl}/api/mails/baja?${qs}`;
}
