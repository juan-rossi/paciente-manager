import { escapeHtml, sendEmail } from "@/lib/email";

// Se llama dentro de `after()` desde POST /api/users: un fallo de Resend no
// tiene que romper la invitación (igual la ve al entrar), solo se loguea.
export async function enviarMailInvitacionSecretaria(
  datos: { email: string; nombreSecretaria: string; nombreMedico: string },
  baseUrl: string
): Promise<void> {
  try {
    await sendEmail({ to: datos.email, ...mailInvitacionSecretaria(datos, baseUrl) });
  } catch (error) {
    console.error("[invitacion-secretaria] no se pudo enviar el mail", error);
  }
}

// Mismo criterio de estilos que `bienvenida-email.ts`: inline y con tablas.
export function mailInvitacionSecretaria(
  datos: { nombreSecretaria: string; nombreMedico: string },
  baseUrl: string
) {
  const saludo = datos.nombreSecretaria ? `Hola, ${datos.nombreSecretaria}` : "Hola";
  const subject = `${datos.nombreMedico} te invitó a administrar su agenda en Semio 360`;
  const cuerpo = `${datos.nombreMedico} quiere sumarte como secretaria/o en Semio 360. Entrá con tu cuenta de siempre para aceptar o rechazar la invitación. Hasta que la aceptes no vas a ver su agenda, y si no lo conocés podés rechazarla.`;
  const link = `${baseUrl}/turnos`;
  const logo = `${baseUrl}/email/semio360-logo.png`;

  const text = [`${saludo}:`, "", cuerpo, "", `Entrar a Semio 360: ${link}`, "", "Equipo de Semio 360"].join("\n");

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
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">Ver invitación</a>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#a1a1aa;">Semio 360 · Más tiempo para lo importante</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
