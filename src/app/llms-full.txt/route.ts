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
Semio360 (también escrito "Semio 360") es una plataforma en la nube para profesionales de la salud (médicos, odontólogos, psicólogos y nutricionistas) que reúne la gestión del consultorio: turnos, historia clínica y evolución de los pacientes en un mismo lugar. Funciona en el navegador, sin instalación.

## Funciones
- Historia clínica electrónica: ficha única por paciente con datos personales, antecedentes, evolución y consentimientos informados, registrada de forma cronológica conforme a la Ley 26.529.
- Turnos: el profesional configura sus días y horarios y el sistema arma la agenda disponible. Los pacientes pueden reservar online desde el perfil público del profesional.
- Dictado y transcripción (Premium): la evolución se dicta desde el navegador y se transcribe automáticamente, con un resumen generado por IA; el audio no se guarda, solo el texto.
- Recordatorios de turno por WhatsApp.
- Roles y auditoría: cada profesional ve solo a sus pacientes y cada cambio queda registrado (quién, qué y cuándo).

## Planes
Básico: historia clínica, turnos, asistentes y recordatorios manuales. Premium: suma dictado con transcripción automática, resúmenes y autocompletado con IA y perfil destacado en el Directorio de profesionales. Prueba gratis sin tarjeta de crédito: 60 días del plan Básico o 30 días del Premium.

## Directorio de profesionales
${absoluteUrl("/directorio")} lista profesionales de la salud con perfil público: especialidad, ciudad, coberturas médicas aceptadas, lugares de atención y reserva de turno online.

## Preguntas frecuentes

${faq}

## Contacto
contacto@semio360.com
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=86400" },
  });
}
