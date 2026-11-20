import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { escapeHtml, sendEmail } from "@/lib/email";
import { CONTACTO_EMAIL } from "@/lib/sancion-email";

// Cambio del email propio (médico o asistente). El email es el usuario con el
// que se ingresa y adonde llega "recuperar contraseña": cambiarlo exige
// probar que la casilla nueva es de quien lo pide (un link que llega SOLO
// ahí) y se avisa a la anterior en cada paso, para que la dueña real se
// entere si alguien con su sesión lo intenta.

export const CAMBIO_EMAIL_VALIDEZ_HORAS = 24;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crea el pedido y manda los mails. Si el email nuevo ya es de otra cuenta no
 * hace nada (la ruta responde igual en los dos casos, para no revelar qué
 * emails tienen cuenta). Solo vale el último pedido de cada usuario.
 */
export async function solicitarCambioEmail(
  user: { id: string; nombre: string; email: string },
  emailNuevo: string,
  baseUrl: string
): Promise<void> {
  const ocupado = await prisma.user.findUnique({ where: { email: emailNuevo }, select: { id: true } });
  if (ocupado) return;

  const token = randomBytes(32).toString("base64url");
  const ahora = new Date();
  await prisma.$transaction([
    prisma.cambioEmail.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: ahora } }),
    prisma.cambioEmail.create({
      data: {
        userId: user.id,
        emailNuevo,
        tokenHash: hashToken(token),
        expiresAt: new Date(ahora.getTime() + CAMBIO_EMAIL_VALIDEZ_HORAS * 60 * 60_000),
      },
    }),
  ]);

  const link = `${baseUrl}/confirmar-email?token=${encodeURIComponent(token)}`;
  await sendEmail({ to: emailNuevo, ...mailConfirmar(user.nombre, emailNuevo, link) });
  await sendEmail({ to: user.email, ...mailAviso(user.nombre, "pedido", emailNuevo) });
}

export type PedidoCambioEmail = { emailNuevo: string };

/** El pedido del token, si sigue vigente (para mostrar la página de confirmación). */
export async function pedidoCambioEmailVigente(token: string): Promise<PedidoCambioEmail | null> {
  const registro = await prisma.cambioEmail.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { emailNuevo: true, usedAt: true, expiresAt: true },
  });
  if (!registro || registro.usedAt || registro.expiresAt < new Date()) return null;
  return { emailNuevo: registro.emailNuevo };
}

export type ResultadoConfirmarEmail = "ok" | "invalido" | "en-uso";

/**
 * Consume el token (un solo uso) y cambia el email. Cierra todas las sesiones
 * de la cuenta (`sessionVersion`) e invalida los links de "recuperar
 * contraseña" pendientes, que llegaron a la casilla anterior.
 */
export async function confirmarCambioEmail(token: string): Promise<ResultadoConfirmarEmail> {
  const registro = await prisma.cambioEmail.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      emailNuevo: true,
      usedAt: true,
      expiresAt: true,
      user: { select: { email: true, nombre: true } },
    },
  });
  if (!registro || registro.usedAt || registro.expiresAt < new Date()) return "invalido";

  const ahora = new Date();
  const resultado = await prisma.$transaction(async (tx): Promise<ResultadoConfirmarEmail> => {
    const consumido = await tx.cambioEmail.updateMany({
      where: { id: registro.id, usedAt: null },
      data: { usedAt: ahora },
    });
    if (consumido.count === 0) return "invalido";

    // Alguien pudo registrarse con ese email después del pedido.
    const ocupado = await tx.user.findUnique({ where: { email: registro.emailNuevo }, select: { id: true } });
    if (ocupado) return "en-uso";

    await tx.user.update({
      where: { id: registro.userId },
      data: { email: registro.emailNuevo, sessionVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: registro.userId, usedAt: null },
      data: { usedAt: ahora },
    });
    return "ok";
  });

  if (resultado === "ok") {
    try {
      await sendEmail({
        to: registro.user.email,
        ...mailAviso(registro.user.nombre, "confirmado", registro.emailNuevo),
      });
    } catch (error) {
      // El cambio ya se hizo: el aviso no puede deshacerlo.
      console.error("[cambio-email] no se pudo avisar al email anterior", error);
    }
  }
  return resultado;
}

// --- Mails (mismo estilo simple que el de restablecer contraseña) ---------

function envolver(parrafos: string[], boton?: { texto: string; link: string }) {
  const cuerpo = parrafos
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(p)}</p>`)
    .join("");
  const botonHtml = boton
    ? `<p style="margin:0 0 24px;"><a href="${escapeHtml(boton.link)}" style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">${escapeHtml(boton.texto)}</a></p>
<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#52525b;">Si el botón no funciona, copiá esta dirección en el navegador:<br><span style="word-break:break-all;color:#4F46E5;">${escapeHtml(boton.link)}</span></p>`
    : "";
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:18px;font-weight:600;">Semio 360</p>
          ${cuerpo}${botonHtml}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function saludoDe(nombre: string) {
  return nombre.trim() ? `Hola ${nombre.trim()},` : "Hola,";
}

function mailConfirmar(nombre: string, emailNuevo: string, link: string) {
  const parrafos = [
    saludoDe(nombre),
    `Pediste usar ${emailNuevo} como el email de tu cuenta de Semio 360. Para confirmarlo, entrá a este link.`,
    `El link vence en ${CAMBIO_EMAIL_VALIDEZ_HORAS} horas y sirve una sola vez. Si no lo pediste vos, ignorá este mail: no se cambia nada.`,
  ];
  return {
    subject: "Confirmá tu nuevo email de Semio 360",
    text: [...parrafos.slice(0, 2), "", link, "", parrafos[2], "", "Equipo de Semio 360"].join("\n"),
    html: envolver(parrafos, { texto: "Confirmar email", link }),
  };
}

function mailAviso(nombre: string, etapa: "pedido" | "confirmado", emailNuevo: string) {
  const parrafos =
    etapa === "pedido"
      ? [
          saludoDe(nombre),
          `Se pidió cambiar el email de tu cuenta de Semio 360 por ${emailNuevo}. El cambio se hace recién cuando se confirme desde esa casilla.`,
          `Si no fuiste vos, cambiá tu contraseña y escribinos a ${CONTACTO_EMAIL}.`,
        ]
      : [
          saludoDe(nombre),
          `El email de tu cuenta de Semio 360 ahora es ${emailNuevo}. Desde ahora ingresás con ese email, y cerramos las sesiones que tenías abiertas.`,
          `Si no fuiste vos, escribinos cuanto antes a ${CONTACTO_EMAIL}.`,
        ];
  return {
    subject: etapa === "pedido" ? "Pedido de cambio de email en Semio 360" : "Cambiaste el email de tu cuenta de Semio 360",
    text: [...parrafos, "", "Equipo de Semio 360"].join("\n"),
    html: envolver(parrafos),
  };
}
