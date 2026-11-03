import { escapeHtml, sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { TITULO_CORTESIA_LABELS, type TituloCortesia } from "@/lib/titulo-cortesia";

export const CONTACTO_EMAIL = "contacto@semio360.com";

export type TipoSancion = "SUSPENSION" | "FUERA_DEL_DIRECTORIO";

type DatosSancion = {
  email: string;
  nombre: string;
  apellido: string;
  tituloCortesia: TituloCortesia | null;
  motivo: string;
};

// Se llama dentro de `after()` desde la ruta del admin: un fallo de Resend no
// tiene que deshacer la sanción, solo se loguea.
export async function enviarMailSancion(tipo: TipoSancion, datos: DatosSancion): Promise<void> {
  try {
    await sendEmail({ to: datos.email, ...mailSancion(tipo, datos) });
  } catch (error) {
    console.error("[sancion] no se pudo enviar el mail", error);
  }
}

// Mismo layout que el mail de bienvenida (ver `bienvenida-email.ts`): tablas y
// estilos inline porque la mayoría de los clientes de mail ignoran <style>.
// Sale desde no-responder@, así que el contacto va escrito en el cuerpo.
export function mailSancion(tipo: TipoSancion, datos: DatosSancion) {
  const nombre = `${datos.nombre} ${datos.apellido}`.trim();
  const nombreConTitulo = datos.tituloCortesia
    ? `${TITULO_CORTESIA_LABELS[datos.tituloCortesia]} ${nombre}`
    : nombre;
  const saludo = nombreConTitulo ? `Hola, ${nombreConTitulo}` : "Hola";
  const logo = `${getSiteUrl()}/email/semio360-logo.png`;

  const { subject, intro, detalle, cierre } =
    tipo === "SUSPENSION"
      ? {
          subject: "Tu cuenta de Semio 360 fue suspendida",
          intro: "Suspendimos tu cuenta de Semio 360 por mal uso de la plataforma.",
          detalle:
            "Mientras dure la suspensión no vas a poder ingresar a Semio 360 y tu perfil no aparece en el directorio. Tus pacientes y sus historias clínicas se conservan intactos.",
          cierre: `Si creés que se trata de un error, o necesitás una copia de las historias clínicas de tus pacientes, escribinos a ${CONTACTO_EMAIL}.`,
        }
      : {
          subject: "Tu perfil fue quitado del directorio de Semio 360",
          intro: "Quitamos tu perfil del directorio de Semio 360 por mal uso de la plataforma.",
          detalle:
            "Tu cuenta sigue funcionando con normalidad: podés seguir atendiendo a tus pacientes y gestionando tus turnos. Lo único que cambia es que tu perfil y tu agenda pública no se muestran a los pacientes.",
          cierre: `Si creés que se trata de un error, escribinos a ${CONTACTO_EMAIL}.`,
        };

  const text = [`${saludo}:`, "", intro, "", `Motivo: ${datos.motivo}`, "", detalle, "", cierre, "", "Equipo de Semio 360"].join(
    "\n"
  );

  const cierreHtml = escapeHtml(cierre).replace(
    escapeHtml(CONTACTO_EMAIL),
    `<strong style="color:#18181b;">${escapeHtml(CONTACTO_EMAIL)}</strong>`
  );

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
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(intro)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
            <tr><td style="padding:10px 12px;border-left:3px solid #dc2626;background:#fef2f2;font-size:14px;line-height:1.5;color:#18181b;">
              <span style="display:block;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#b91c1c;">Motivo</span>
              ${escapeHtml(datos.motivo)}
            </td></tr>
          </table>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(detalle)}</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">${cierreHtml}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#a1a1aa;">Semio 360 · Más tiempo para lo importante</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
