import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { escapeHtml, sendEmail } from "@/lib/email";

export const RESET_VALIDEZ_MINUTOS = 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Genera el token, invalida los pedidos anteriores del mismo usuario (solo
// sirve el último link mandado) y envía el mail. Si el email no existe no
// hace nada -- la ruta responde igual en ambos casos para no revelar qué
// emails tienen cuenta.
export async function solicitarRestablecimiento(email: string, baseUrl: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, nombre: true, email: true },
  });
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  const ahora = new Date();
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: ahora },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(ahora.getTime() + RESET_VALIDEZ_MINUTOS * 60_000),
      },
    }),
  ]);

  const link = `${baseUrl}/restablecer?token=${encodeURIComponent(token)}`;
  await sendEmail({ to: user.email, ...mailRestablecer(user.nombre, link) });
}

export type ResultadoRestablecer = "ok" | "invalido";

// Consume el token (un solo uso), guarda la contraseña nueva e incrementa
// `sessionVersion` para cerrar todas las sesiones abiertas de la cuenta.
// El `updateMany` condicionado a `usedAt: null` hace que dos requests
// simultáneas con el mismo token no puedan usarlo las dos.
export async function restablecerPassword(token: string, password: string): Promise<ResultadoRestablecer> {
  const registro = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!registro || registro.usedAt || registro.expiresAt < new Date()) return "invalido";

  const passwordHash = await hashPassword(password);
  return prisma.$transaction(async (tx) => {
    const consumido = await tx.passwordResetToken.updateMany({
      where: { id: registro.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumido.count === 0) return "invalido";

    await tx.user.update({
      where: { id: registro.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    return "ok";
  });
}

export async function tokenRestablecerValido(token: string): Promise<boolean> {
  const registro = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { usedAt: true, expiresAt: true },
  });
  return !!registro && !registro.usedAt && registro.expiresAt >= new Date();
}

// Mail deliberadamente simple (sin imágenes, un solo link al dominio
// propio, versión en texto plano) -- es lo que mejor pasa los filtros de
// spam. Estilos inline porque la mayoría de los clientes de mail ignoran
// los <style>.
function mailRestablecer(nombre: string, link: string) {
  const saludo = nombre.trim() ? `Hola ${nombre.trim()},` : "Hola,";
  const subject = "Restablecé tu contraseña de Semio 360";

  const text = [
    saludo,
    "",
    "Recibimos un pedido para restablecer la contraseña de tu cuenta de Semio 360.",
    "Para elegir una contraseña nueva, entrá a este link:",
    "",
    link,
    "",
    `El link vence en ${RESET_VALIDEZ_MINUTOS} minutos y sirve una sola vez.`,
    "Si no lo pediste vos, ignorá este mail: tu contraseña actual sigue funcionando.",
    "",
    "Equipo de Semio 360",
  ].join("\n");

  const linkHtml = escapeHtml(link);
  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:18px;font-weight:600;">Semio 360</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(saludo)}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Recibimos un pedido para restablecer la contraseña de tu cuenta. Tocá el botón para elegir una nueva:</p>
          <p style="margin:0 0 24px;">
            <a href="${linkHtml}" style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">Elegir contraseña nueva</a>
          </p>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#52525b;">El link vence en ${RESET_VALIDEZ_MINUTOS} minutos y sirve una sola vez. Si el botón no funciona, copiá esta dirección en el navegador:<br><span style="word-break:break-all;color:#4F46E5;">${linkHtml}</span></p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#52525b;">Si no lo pediste vos, ignorá este mail: tu contraseña actual sigue funcionando.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
