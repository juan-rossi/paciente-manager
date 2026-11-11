import { z } from "zod";
import type { TicketEstado, TicketTipo } from "@/generated/prisma/client";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";

// Sugerencias y reportes de problemas de médicos/secretarias (ver
// `TicketSoporte`). Del lado del consultorio: ícono del header + /soporte.
// Del lado del equipo: /admin/soporte.

export const TIPO_LABELS: Record<TicketTipo, string> = {
  SUGERENCIA: "Sugerencia",
  PROBLEMA: "Problema",
  OTRO: "Otro",
};

export const ESTADO_LABELS: Record<TicketEstado, string> = {
  NUEVO: "Nuevo",
  EN_REVISION: "En revisión",
  PLANIFICADO: "Planificado",
  RESUELTO: "Resuelto",
  DESCARTADO: "Descartado",
};

export const ESTADOS: TicketEstado[] = ["NUEVO", "EN_REVISION", "PLANIFICADO", "RESUELTO", "DESCARTADO"];
export const ESTADOS_ABIERTOS: TicketEstado[] = ["NUEVO", "EN_REVISION", "PLANIFICADO"];

// Mismos tonos en las dos puntas (pill de estado).
export const ESTADO_CLASES: Record<TicketEstado, string> = {
  NUEVO: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  EN_REVISION: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  PLANIFICADO: "bg-primary/10 text-primary",
  RESUELTO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  DESCARTADO: "bg-muted text-muted-foreground",
};

export const MAX_ASUNTO = 120;
export const MAX_CUERPO = 5000;

const cuerpo = z.string().trim().min(1, "Escribí un mensaje.").max(MAX_CUERPO, "El mensaje es demasiado largo.");

export const nuevoTicketInput = z.object({
  tipo: z.enum(["SUGERENCIA", "PROBLEMA", "OTRO"]),
  asunto: z.string().trim().min(3, "Poné un asunto corto.").max(MAX_ASUNTO, "El asunto es demasiado largo."),
  cuerpo,
  // Pantalla desde la que abrió el formulario -- solo contexto.
  pantalla: z.string().trim().max(300).optional(),
});

export const respuestaUsuarioInput = z.object({ cuerpo });

export const respuestaAdminInput = z
  .object({
    cuerpo: z.string().trim().max(MAX_CUERPO, "El mensaje es demasiado largo.").optional(),
    interno: z.boolean().default(false),
    estado: z.enum(["NUEVO", "EN_REVISION", "PLANIFICADO", "RESUELTO", "DESCARTADO"]).optional(),
  })
  .refine((d) => (d.cuerpo && d.cuerpo.length > 0) || d.estado, {
    message: "Escribí una respuesta o elegí un estado.",
  });

const fechaFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function formatFechaTicket(fecha: Date): string {
  return fechaFormatter.format(fecha);
}

// "Chrome · Windows" a partir del user-agent -- solo para leer de un vistazo
// en /admin/soporte (el UA completo queda en el tooltip).
export function resumirUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  const navegador = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Otro navegador";
  const sistema = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Otro sistema";
  return `${navegador} · ${sistema}`;
}

// Se llama dentro de `after()` desde la ruta del admin: si Resend falla, la
// respuesta igual queda guardada y el usuario la ve en la app.
export async function enviarMailRespuestaSoporte(datos: {
  email: string;
  nombre: string;
  ticketId: string;
  asunto: string;
  respuesta: string;
}): Promise<void> {
  try {
    await sendEmail({ to: datos.email, ...mailRespuestaSoporte(datos) });
  } catch (error) {
    console.error("[soporte] no se pudo enviar el mail de respuesta", error);
  }
}

// Mismo layout que el resto de los mails (ver `sancion-email.ts`).
export function mailRespuestaSoporte(datos: { nombre: string; ticketId: string; asunto: string; respuesta: string }) {
  const saludo = datos.nombre ? `Hola, ${datos.nombre}` : "Hola";
  const link = `${getSiteUrl()}/soporte/${datos.ticketId}`;
  const logo = `${getSiteUrl()}/email/semio360-logo.png`;
  const subject = `Respondimos tu mensaje: ${datos.asunto}`;
  const intro = "Te respondimos el mensaje que nos mandaste desde Semio 360. Gracias por tomarte el tiempo de escribirnos.";

  const text = [
    `${saludo}:`,
    "",
    intro,
    "",
    `“${datos.asunto}”`,
    "",
    datos.respuesta,
    "",
    `Podés ver la conversación y contestarnos acá: ${link}`,
    "",
    "Equipo de Semio 360",
  ].join("\n");

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
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="padding:12px 14px;border-left:3px solid #4f46e5;background:#eef2ff;font-size:14px;line-height:1.6;color:#18181b;white-space:pre-line;">
              <span style="display:block;margin-bottom:4px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#4338ca;">${escapeHtml(datos.asunto)}</span>
              ${escapeHtml(datos.respuesta)}
            </td></tr>
          </table>
          <a href="${escapeHtml(link)}" style="display:inline-block;padding:11px 20px;border-radius:8px;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Ver la conversación</a>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#a1a1aa;">Semio 360 · Más tiempo para lo importante</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
