import { escapeHtml, sendEmail } from "@/lib/email";
import { TRIAL_DIAS } from "@/lib/plan";
import { TITULO_CORTESIA_LABELS, type TituloCortesia } from "@/lib/titulo-cortesia";

export type DatosBienvenida = {
  email: string;
  nombre: string;
  apellido: string;
  tituloCortesia: TituloCortesia | null;
  plan: "BASICA" | "PREMIUM";
};

// Se llama dentro de `after()` desde el registro (email/contraseña y
// post-Google): un fallo de Resend no tiene que romper el alta, solo se
// loguea.
export async function enviarMailBienvenida(datos: DatosBienvenida, baseUrl: string): Promise<void> {
  try {
    await sendEmail({ to: datos.email, ...mailBienvenida(datos, baseUrl) });
  } catch (error) {
    console.error("[bienvenida] no se pudo enviar el mail", error);
  }
}

type Paso = { titulo: string; detalle: string };

// El trial es de Básico (sin dictado ni IA): a esa cuenta no se le sugiere
// dictar. Premium arranca sin trial, inactiva hasta que se confirme el pago.
function pasosPorPlan(plan: DatosBienvenida["plan"]): Paso[] {
  const comunes: Paso[] = [
    { titulo: "Completá tu perfil.", detalle: "Lugar de atención y horarios, desde Configuración." },
    { titulo: "Cargá tu primer paciente.", detalle: "Con nombre y DNI alcanza para empezar." },
  ];
  return plan === "PREMIUM"
    ? [...comunes, { titulo: "Dictá una consulta.", detalle: "Hablá y Semio arma la evolución por vos." }]
    : [...comunes, { titulo: "Agendá tu primer turno.", detalle: "Y mandale el recordatorio por WhatsApp." }];
}

// Estilos inline y layout con tablas porque la mayoría de los clientes de
// mail ignoran <style> y flexbox. El logo va por URL absoluta (Gmail y
// Outlook no muestran imágenes en base64) y al doble de resolución para
// pantallas retina.
export function mailBienvenida(datos: DatosBienvenida, baseUrl: string) {
  const nombre = `${datos.nombre} ${datos.apellido}`.trim();
  const nombreConTitulo = datos.tituloCortesia
    ? `${TITULO_CORTESIA_LABELS[datos.tituloCortesia]} ${nombre}`
    : nombre;
  const saludo = nombreConTitulo ? `Hola, ${nombreConTitulo}` : "Hola";
  // "Te damos la bienvenida" en vez de "Bienvenido/a": el título no siempre
  // dice el género (Lic., Méd., Odont.).
  const subject = "Te damos la bienvenida a Semio 360";

  const intro =
    datos.plan === "PREMIUM"
      ? "Tu cuenta ya está creada. Apenas se confirme el pago del plan Premium vas a tener acceso a todo. Para arrancar te sugerimos tres cosas:"
      : `Tu cuenta ya está activa. Tenés ${TRIAL_DIAS} días de prueba del plan Básico, sin cargar tarjeta. Para arrancar te sugerimos tres cosas:`;
  const pasos = pasosPorPlan(datos.plan);
  const link = `${baseUrl}/dashboard`;
  const logo = `${baseUrl}/email/semio360-logo.png`;
  // Sin casilla de respuesta configurada las respuestas irían a
  // no-responder@, así que solo se invita a responder si existe.
  const invitaResponder = Boolean(process.env.EMAIL_REPLY_TO);

  const text = [
    `${saludo}:`,
    "",
    intro,
    "",
    ...pasos.map((p, i) => `${i + 1}. ${p.titulo} ${p.detalle}`),
    "",
    `Entrar a Semio 360: ${link}`,
    ...(invitaResponder ? ["", "¿Dudas? Respondé este mail y te contestamos nosotros."] : []),
    "",
    "Equipo de Semio 360",
  ].join("\n");

  const pasosHtml = pasos
    .map((p, i) => {
      const borde = i === pasos.length - 1 ? "border-top:1px solid #ececf1;border-bottom:1px solid #ececf1;" : "border-top:1px solid #ececf1;";
      return `<tr><td style="padding:12px 0;${borde}font-size:14px;line-height:1.5;color:#3f3f46;"><strong style="color:#18181b;">${i + 1}. ${escapeHtml(p.titulo)}</strong> ${escapeHtml(p.detalle)}</td></tr>`;
    })
    .join("\n          ");

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
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(intro)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          ${pasosHtml}
          </table>
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">Entrar a Semio 360</a>${
            invitaResponder
              ? `\n          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">¿Dudas? Respondé este mail y te contestamos nosotros.</p>`
              : ""
          }
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#a1a1aa;">Semio 360 · Más tiempo para lo importante</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
