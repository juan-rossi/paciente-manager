import { FAQS } from "@/lib/faq";
import { absoluteUrl, esProduccion } from "@/lib/site-url";
import { SITE_DESCRIPTION } from "@/lib/seo";

export const revalidate = 86400;

// Versión extendida de llms.txt: el contenido citable del sitio en texto plano.
export function GET() {
  if (!esProduccion()) return new Response("Not found", { status: 404 });

  const faq = FAQS.map((f) => `### ${f.q}\n${f.a}`).join("\n\n");
  const body = `# Semio360

> ${SITE_DESCRIPTION}

Sitio: ${absoluteUrl("/")}

## Qué es
Semio360 es una plataforma en la nube para gestionar un consultorio médico: turnos, historia clínica y evolución de los pacientes en un mismo lugar. Funciona en el navegador, sin instalación.

## Funciones
- Historia clínica electrónica: ficha única por paciente con datos personales, antecedentes, evolución y consentimientos informados, registrada de forma cronológica conforme a la Ley 26.529.
- Turnos: el médico configura sus días y horarios y el sistema arma la agenda disponible. Los pacientes pueden reservar online desde el perfil público del médico.
- Dictado y transcripción: la consulta se dicta y se transcribe; el audio se procesa en la computadora del médico y no sale de ella.
- Recordatorios de turno por WhatsApp (manuales en el plan Básico).
- Roles y auditoría: cada médico ve solo a sus pacientes y cada cambio queda registrado (quién, qué y cuándo).

## Planes
Básico: historia clínica, turnos, transcripción y recordatorios manuales. Premium: suma resúmenes y autocompletado con IA y envío automático de recordatorios cuando esté disponible. 60 días de prueba gratis, sin tarjeta de crédito.

## Directorio de médicos
${absoluteUrl("/directorio")} lista médicos con perfil público: especialidad, ciudad, coberturas médicas aceptadas, lugares de atención y reserva de turno online.

## Preguntas frecuentes

${faq}

## Contacto
contacto@semio360.com
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=86400" },
  });
}
