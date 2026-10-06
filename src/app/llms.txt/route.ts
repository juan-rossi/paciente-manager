import { absoluteUrl, esProduccion } from "@/lib/site-url";
import { SITE_DESCRIPTION } from "@/lib/seo";

export const revalidate = 86400;

// llms.txt: resumen del sitio en Markdown para motores de IA (ver llmstxt.org).
export function GET() {
  if (!esProduccion()) return new Response("Not found", { status: 404 });

  const body = `# Semio360

> ${SITE_DESCRIPTION}

Semio360 es una plataforma web (sin instalación) para médicos y consultorios de Argentina. Reúne agenda de turnos con reserva online, historia clínica electrónica, consentimiento informado y dictado de la consulta con transcripción. Incluye 60 días de prueba gratis, sin tarjeta. También mantiene un directorio público de médicos con perfil verificado, filtrable por especialidad y ciudad.

## Páginas principales

- [Inicio](${absoluteUrl("/")}): qué es Semio360, funciones, seguridad, planes y preguntas frecuentes.
- [Preguntas frecuentes](${absoluteUrl("/#faq")}): respuestas sobre uso, planes y protección de datos.
- [Planes](${absoluteUrl("/#planes")}): Básico y Premium.
- [Directorio de médicos](${absoluteUrl("/directorio")}): perfiles de médicos con especialidad, coberturas, lugares de atención y turnos online.
- [Términos y condiciones](${absoluteUrl("/terminos")})

## Contenido completo

- [Versión extendida en texto plano](${absoluteUrl("/llms-full.txt")})

## Contacto

contacto@semio360.com
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=86400" },
  });
}
