import { escapeHtml } from "@/lib/email";
import type { MailEngagementTipo } from "@/lib/engagement";
import { TITULO_CORTESIA_LABELS, type TituloCortesia } from "@/lib/titulo-cortesia";

// Textos de los mails de activación del trial (ver `engagement.ts`). Cada mail
// empuja UNA sola acción, con un único botón. Mismo layout que el mail de
// bienvenida (`bienvenida-email.ts`): tablas y estilos inline.

export type DatosMailEngagement = {
  nombre: string;
  apellido: string;
  tituloCortesia: TituloCortesia | null;
  plan: "BASICA" | "PREMIUM";
  trialEndsAt: Date | null;
};

export type ContextoMail = {
  baseUrl: string;
  urlBaja: string;
  // Solo para el mail FUNDADOR (ver `remitenteFundador`).
  fundadorNombre?: string;
};

type Contenido = {
  subject: string;
  parrafos: string[];
  pasos?: string[];
  cta?: { label: string; path: string };
  // Mail "personal": sin logo ni botón, parece escrito a mano.
  personal?: boolean;
  firma?: string;
};

const ZONA = "America/Argentina/Buenos_Aires";
const DIA_MS = 24 * 60 * 60 * 1000;

function fechaLarga(fecha: Date): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "numeric", month: "long" }).format(fecha);
}

function diasRestantes(fecha: Date | null, ahora: Date): number {
  if (!fecha) return 0;
  return Math.max(0, Math.ceil((fecha.getTime() - ahora.getTime()) / DIA_MS));
}

function saludoDe(d: DatosMailEngagement): string {
  const nombre = `${d.nombre} ${d.apellido}`.trim();
  const conTitulo = d.tituloCortesia ? `${TITULO_CORTESIA_LABELS[d.tituloCortesia]} ${nombre}` : nombre;
  return conTitulo ? `Hola, ${conTitulo}` : "Hola";
}

function contenido(tipo: MailEngagementTipo, d: DatosMailEngagement, ctx: ContextoMail, ahora: Date): Contenido {
  const nombrePlan = d.plan === "PREMIUM" ? "Premium" : "Básico";
  const fin = d.trialEndsAt ? fechaLarga(d.trialEndsAt) : "";
  const elegirPlan = { label: "Elegir mi plan", path: "/configuracion?tab=plan" };

  switch (tipo) {
    case "CONFIGURAR_CONSULTORIO":
      return {
        subject: "Configurá tu consultorio en 2 minutos",
        parrafos: [
          "Para armarte la agenda, Semio360 necesita saber dónde atendés y en qué horarios.",
          "Con eso ya podés dar turnos y, si querés, que tus pacientes los reserven solos desde tu página.",
        ],
        cta: { label: "Configurar mi consultorio", path: "/configuracion?tab=practica" },
      };
    case "PRIMER_PACIENTE":
      return {
        subject: "Cargá tu primer paciente",
        parrafos: [
          "Con nombre y DNI alcanza para empezar: el resto lo completás cuando lo atiendas.",
          "¿Ya tenés tus historias clínicas en otro sistema o en planillas? Desde Configuración › Mis datos nos las podés mandar y las importamos por vos.",
        ],
        cta: { label: "Cargar un paciente", path: "/patients/new" },
      };
    case "FUNDADOR": {
      const fundador = ctx.fundadorNombre ?? "";
      return {
        subject: "¿Te ayudo a arrancar con Semio360?",
        personal: true,
        parrafos: [
          `Soy ${fundador}, uno de los creadores de Semio360. Vi que te registraste hace unos días y quería preguntarte cómo te está yendo.`,
          "¿Hay algo que te frene para empezar a usarlo? Puede ser que falte alguna función, que algo no se entienda o simplemente que no tuviste tiempo. Cualquier respuesta me sirve.",
          "Respondé este mail y lo leo yo.",
        ],
        firma: fundador,
      };
    }
    case "PRIMER_TURNO":
      return {
        subject: "Dale turno a tu próximo paciente desde Semio360",
        parrafos: [
          "Ya tenés pacientes cargados. El próximo paso es la agenda: das un turno en segundos y Semio360 te arma el recordatorio por WhatsApp para que no se olviden.",
        ],
        cta: { label: "Ir a la agenda", path: "/turnos" },
      };
    case "PRIMER_DICTADO":
      return {
        subject: "Dictá la consulta y Semio360 la escribe por vos",
        parrafos: [
          "Tu prueba Premium incluye el dictado: hablás como si se lo contaras a un colega y la evolución queda escrita y ordenada en la historia clínica.",
          "Probalo con tu próximo paciente: abrí su ficha y tocá «Dictar».",
        ],
        cta: { label: "Ir a mis pacientes", path: "/patients" },
      };
    case "SEGUIMIENTO":
      return {
        subject: "Tu prueba de Semio360 sigue activa",
        parrafos: [
          `Te quedan ${diasRestantes(d.trialEndsAt, ahora)} días de prueba del plan ${nombrePlan}. Sabemos que arrancar con un sistema nuevo lleva tiempo, así que te dejamos lo esencial:`,
        ],
        pasos: [
          "Configurá dónde y cuándo atendés.",
          "Cargá a los pacientes que ves esta semana.",
          "Dales turno desde la agenda.",
        ],
        cta: { label: "Entrar a Semio360", path: "/dashboard" },
      };
    case "TRIAL_TERMINA_PRONTO":
      return {
        subject: `Tu prueba de Semio360 termina en ${diasRestantes(d.trialEndsAt, ahora)} días`,
        parrafos: [
          `Tu prueba del plan ${nombrePlan} termina el ${fin}. Para seguir usando Semio360 sin interrupciones, elegí tu plan desde Mi plan.`,
          "Tus pacientes, historias clínicas y turnos quedan como están.",
        ],
        cta: elegirPlan,
      };
    case "TRIAL_TERMINA_MANANA":
      return {
        subject: "Tu prueba de Semio360 termina mañana",
        parrafos: [
          `Mañana (${fin}) termina tu prueba del plan ${nombrePlan}. Elegí tu plan hoy y mañana seguís atendiendo como siempre.`,
        ],
        cta: elegirPlan,
      };
    case "TRIAL_VENCIDO":
      return {
        subject: "Tus datos en Semio360 siguen guardados",
        parrafos: [
          `Tu prueba terminó el ${fin}. Tus pacientes, historias clínicas y turnos siguen guardados: elegí un plan y seguís exactamente donde lo dejaste.`,
        ],
        cta: elegirPlan,
      };
  }
}

const FUENTE = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

export function mailEngagement(
  tipo: MailEngagementTipo,
  datos: DatosMailEngagement,
  ctx: ContextoMail,
  ahora: Date = new Date()
): { subject: string; html: string; text: string } {
  const c = contenido(tipo, datos, ctx, ahora);
  const saludo = saludoDe(datos);
  const campaign = tipo.toLowerCase();
  const link = c.cta
    ? `${ctx.baseUrl}${c.cta.path}${c.cta.path.includes("?") ? "&" : "?"}utm_source=email&utm_medium=engagement&utm_campaign=${campaign}`
    : null;
  const firma = c.firma ?? "Equipo de Semio360";
  const pieTexto = "Recibís este mail porque te registraste en Semio360.";

  const text = [
    `${saludo}:`,
    "",
    ...c.parrafos.flatMap((p) => [p, ""]),
    ...(c.pasos ? [...c.pasos.map((p, i) => `${i + 1}. ${p}`), ""] : []),
    ...(c.cta && link ? [`${c.cta.label}: ${link}`, ""] : []),
    firma,
    "",
    "--",
    pieTexto,
    `Para no recibir más estos mails: ${ctx.urlBaja}`,
  ].join("\n");

  const pie = `<p style="margin:16px 0 0;font-family:${FUENTE};font-size:12px;line-height:1.6;color:#a1a1aa;">${escapeHtml(pieTexto)}<br><a href="${escapeHtml(ctx.urlBaja)}" style="color:#a1a1aa;">No quiero recibir más estos mails</a></p>`;

  if (c.personal) {
    // Sin tarjeta, logo ni botón: que se lea como un mail escrito a mano.
    const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px 16px;background:#ffffff;">
  <div style="max-width:560px;font-family:${FUENTE};font-size:15px;line-height:1.6;color:#18181b;">
    <p style="margin:0 0 16px;">${escapeHtml(saludo)}:</p>
    ${c.parrafos.map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`).join("\n    ")}
    <p style="margin:0;">${escapeHtml(firma)}</p>
    ${pie}
  </div>
</body>
</html>`;
    return { subject: c.subject, html, text };
  }

  const logo = `${ctx.baseUrl}/email/semio360-logo.png`;
  const pasosHtml = c.pasos
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          ${c.pasos
            .map((p, i) => {
              const borde =
                i === c.pasos!.length - 1
                  ? "border-top:1px solid #ececf1;border-bottom:1px solid #ececf1;"
                  : "border-top:1px solid #ececf1;";
              return `<tr><td style="padding:12px 0;${borde}font-size:14px;line-height:1.5;color:#3f3f46;"><strong style="color:#18181b;">${i + 1}.</strong> ${escapeHtml(p)}</td></tr>`;
            })
            .join("\n          ")}
          </table>`
    : "";
  const boton =
    c.cta && link
      ? `<a href="${escapeHtml(link)}" style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">${escapeHtml(c.cta.label)}</a>`
      : "";

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f5f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;font-family:${FUENTE};color:#18181b;">
        <tr><td style="padding:32px 32px 8px;">
          <img src="${escapeHtml(logo)}" width="200" height="56" alt="Semio360" style="display:block;width:200px;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:16px 32px 32px;">
          <p style="margin:0 0 16px;font-size:20px;font-weight:600;line-height:1.3;">${escapeHtml(saludo)}</p>
          ${c.parrafos.map((p) => `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(p)}</p>`).join("\n          ")}
          ${pasosHtml}
          ${boton}
        </td></tr>
      </table>
      ${pie}
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: c.subject, html, text };
}
