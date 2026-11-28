import { escapeHtml, sendEmail } from "@/lib/email";
import { CONTACTO_EMAIL } from "@/lib/sancion-email";

type Datos = {
  emailAnterior: string;
  emailNuevo: string;
  nombreSecretaria: string;
  nombreMedico: string;
};

// Aviso a la dirección ANTERIOR cuando un médico le cambia el email de
// acceso a su asistente (PATCH /api/users/[id]): con el email nuevo se
// puede pedir "recuperar contraseña", así que la dueña de la cuenta tiene
// que enterarse por un canal que todavía controla. Se llama dentro de
// `after()`: un fallo de Resend no deshace el cambio, solo se loguea.
export async function avisarEmailDeAccesoCambiado(datos: Datos): Promise<void> {
  try {
    await sendEmail({ to: datos.emailAnterior, ...mailEmailDeAccesoCambiado(datos) });
  } catch (error) {
    console.error("[email-acceso-cambiado] no se pudo enviar el mail", error);
  }
}

export function mailEmailDeAccesoCambiado(datos: Datos) {
  const saludo = datos.nombreSecretaria ? `Hola, ${datos.nombreSecretaria}` : "Hola";
  const subject = "Cambiaron el email de tu cuenta de Semio360";
  const intro = `${datos.nombreMedico} cambió el email con el que ingresás a Semio360 por ${datos.emailNuevo}.`;
  const detalle =
    "Desde ahora vas a tener que ingresar con ese email, y cerramos las sesiones que tenías abiertas.";
  const cierre = `Si no estabas al tanto de este cambio, escribinos a ${CONTACTO_EMAIL}.`;

  const text = [`${saludo}:`, "", intro, "", detalle, "", cierre, "", "Equipo de Semio360"].join("\n");

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f5f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:20px;font-weight:600;line-height:1.3;">${escapeHtml(saludo)}</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(intro)}</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(detalle)}</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(cierre)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
