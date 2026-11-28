import { escapeHtml, sendEmail } from "@/lib/email";
import { CONTACTO_EMAIL } from "@/lib/sancion-email";
import { BAJA_DIAS_PARA_DESCARGAR } from "@/lib/baja-cuenta";

// Avisos del Acuerdo de tratamiento de datos (baja de la cuenta e
// importación de HC). Se llaman dentro de `after()`: un fallo de Resend no
// deshace la acción, solo se loguea.

function formatFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function armarMail(saludo: string, subject: string, parrafos: string[]) {
  const text = [`${saludo}:`, "", ...parrafos.flatMap((p) => [p, ""]), "Equipo de Semio360"].join("\n");
  const cuerpo = parrafos
    .map(
      (p, i) =>
        `<p style="margin:0 0 ${i === parrafos.length - 1 ? 0 : 16}px;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(p)}</p>`
    )
    .join("\n          ");
  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f5f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:20px;font-weight:600;line-height:1.3;">${escapeHtml(saludo)}</p>
          ${cuerpo}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html, text };
}

function saludoPara(nombre: string) {
  return nombre ? `Hola, ${nombre}` : "Hola";
}

export function mailBajaCuenta(datos: { nombre: string; eliminacionEl: Date; baseUrl: string }) {
  return armarMail(saludoPara(datos.nombre), "Diste de baja tu cuenta de Semio360", [
    `Recibimos tu pedido de baja. Durante los próximos ${BAJA_DIAS_PARA_DESCARGAR} días podés ingresar solo para descargar tus datos, desde ${datos.baseUrl}/cuenta-baja.`,
    `El ${formatFecha(datos.eliminacionEl)} vamos a borrar todos los datos de tu cuenta. Recordá que las historias clínicas se deben conservar 10 años: guardá tu descarga.`,
    "Si te arrepentiste, podés cancelar la baja desde esa misma pantalla antes de esa fecha.",
    `Si no pediste la baja, escribinos ya a ${CONTACTO_EMAIL}.`,
  ]);
}

export async function avisarBajaCuenta(to: string, datos: Parameters<typeof mailBajaCuenta>[0]) {
  try {
    await sendEmail({ to, ...mailBajaCuenta(datos) });
  } catch (error) {
    console.error("[email-datos] no se pudo enviar el aviso de baja", error);
  }
}

export function mailImportacionCargada(datos: { nombre: string; notaEquipo: string | null; baseUrl: string }) {
  return armarMail(saludoPara(datos.nombre), "Terminamos de cargar tus historias clínicas", [
    "Terminamos de cargar en Semio360 las historias clínicas que nos enviaste, y ya borramos los archivos.",
    ...(datos.notaEquipo ? [datos.notaEquipo] : []),
    `Revisá tus pacientes y confirmanos que está todo bien desde Configuración > Mis datos: ${datos.baseUrl}/configuracion?tab=datos`,
    "Si algo no quedó bien, contanos desde Soporte.",
  ]);
}

export async function avisarImportacionCargada(to: string, datos: Parameters<typeof mailImportacionCargada>[0]) {
  try {
    await sendEmail({ to, ...mailImportacionCargada(datos) });
  } catch (error) {
    console.error("[email-datos] no se pudo enviar el aviso de importación cargada", error);
  }
}

export function mailImportacionRechazada(datos: { nombre: string; motivo: string; baseUrl: string }) {
  return armarMail(saludoPara(datos.nombre), "No pudimos cargar tus historias clínicas", [
    "Revisamos los archivos que nos enviaste para importar, pero no pudimos cargarlos. Ya los borramos.",
    datos.motivo,
    `Cuando los tengas, podés enviarnos otros desde Configuración > Mis datos: ${datos.baseUrl}/configuracion?tab=datos`,
    "Si tenés dudas sobre qué mandar, escribinos desde Soporte.",
  ]);
}

export async function avisarImportacionRechazada(to: string, datos: Parameters<typeof mailImportacionRechazada>[0]) {
  try {
    await sendEmail({ to, ...mailImportacionRechazada(datos) });
  } catch (error) {
    console.error("[email-datos] no se pudo enviar el aviso de importación rechazada", error);
  }
}
