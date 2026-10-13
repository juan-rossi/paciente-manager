import { escapeHtml } from "@/lib/email";
import { INVITACION_VALIDEZ_DIAS } from "@/lib/invitacion-secretaria-shared";

type DatosMail = {
  nombreSecretaria: string;
  nombreMedico: string;
  // Cuenta sin contraseña todavía: el mail la invita a crear su acceso. Si
  // ya tiene una, solo a entrar con la de siempre para aceptar.
  cuentaNueva: boolean;
};

// Mismo criterio de estilos que `bienvenida-email.ts`: inline y con tablas.
export function mailInvitacionSecretaria(datos: DatosMail, link: string) {
  const baseUrl = new URL(link).origin;
  const saludo = datos.nombreSecretaria ? `Hola, ${datos.nombreSecretaria}` : "Hola";
  const subject = `${datos.nombreMedico} te invitó a administrar su agenda en Semio 360`;
  const cuerpo = datos.cuentaNueva
    ? `${datos.nombreMedico} quiere sumarte como secretaria/o en Semio 360 para que puedas gestionar sus turnos. Para aceptar, elegí tu contraseña o entrá con tu cuenta de Google.`
    : `${datos.nombreMedico} quiere sumarte como secretaria/o en Semio 360. Entrá con tu cuenta de siempre para aceptar la invitación. Hasta que la aceptes no vas a ver su agenda, y si no lo conocés podés ignorarla.`;
  const nota = `El link vence en ${INVITACION_VALIDEZ_DIAS} días. Si no conocés a quien te invitó, ignorá este mail.`;
  const logo = `${baseUrl}/email/semio360-logo.png`;

  const text = [`${saludo}:`, "", cuerpo, "", `Aceptar la invitación: ${link}`, "", nota, "", "Equipo de Semio 360"].join(
    "\n"
  );

  const linkHtml = escapeHtml(link);
  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f5f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
        <tr><td style="padding:32px 32px 8px;">
          <img src="${escapeHtml(logo)}" width="200" height="56" alt="Semio 360" style="display:block;width:200px;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:16px 32px 32px;">
          <p style="margin:0 0 16px;font-size:20px;font-weight:600;line-height:1.3;">${escapeHtml(saludo)}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(cuerpo)}</p>
          <a href="${linkHtml}" style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">Aceptar invitación</a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">${escapeHtml(nota)} Si el botón no funciona, copiá esta dirección en el navegador:<br><span style="word-break:break-all;color:#4F46E5;">${linkHtml}</span></p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#a1a1aa;">Semio 360 · Más tiempo para lo importante</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
