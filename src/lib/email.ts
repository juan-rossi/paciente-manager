import { Resend } from "resend";

// Remitente desde el subdominio `mail.semio360.com` (verificado en Resend
// con SPF/DKIM propios) -- así la reputación de los envíos automáticos no
// se mezcla con la del mail de Google Workspace del dominio raíz.
const FROM_DEFAULT = "Semio 360 <no-responder@mail.semio360.com>";

type EmailInput = {
  to: string;
  subject: string;
  html: string;
  // Siempre se manda también la versión en texto plano: mejora la
  // entregabilidad y es lo que ven los clientes de mail sin HTML.
  text: string;
};

// Sin `RESEND_API_KEY` (dev local) no se manda nada: el mail se imprime en
// la consola del `npm run dev` para poder seguir el link a mano. En
// producción sin key es un error de configuración y se lanza.
export async function sendEmail({ to, subject, html, text }: EmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Falta RESEND_API_KEY: no se puede enviar mail.");
    }
    console.log(`\n[email] Para: ${to}\n[email] Asunto: ${subject}\n${text}\n`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || FROM_DEFAULT,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    throw new Error(`Resend: ${error.name} - ${error.message}`);
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
