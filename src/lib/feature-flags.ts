// Features que se prenden por entorno (variables de Vercel / .env.local).
// Solo del servidor: un componente cliente recibe el valor por props.
//
// Regla: una feature nueva arranca APAGADA en producción y QA. Se prende
// solo cuando se pide explícitamente, cargando la variable en ese entorno
// con el valor exacto "true" (cualquier otra cosa, o no tenerla, = apagada).

/**
 * Teleconsulta (lugares VIRTUAL + salas de videollamada de Daily.co).
 * Variable: TELECONSULTA_HABILITADA=true. Además necesita DAILY_API_KEY y
 * DAILY_DOMAIN para que las salas funcionen (ver `src/lib/daily.ts`).
 *
 * Apagada: no se pueden crear lugares de Teleconsulta (UI y API), las salas
 * devuelven 404 y la plantilla de recordatorio de teleconsulta no se muestra.
 *
 * Prendida, cada médico elige si la usa en Configuración > Teleconsulta (ver
 * `src/lib/teleconsulta-config.ts` y `getTeleconsultaDelMedico`).
 */
export function teleconsultaHabilitada(): boolean {
  return process.env.TELECONSULTA_HABILITADA === "true";
}

/**
 * Mails automáticos de activación del trial (ver `src/lib/engagement.ts`).
 * Variable: ENGAGEMENT_EMAILS=true. Además necesita
 * ENGAGEMENT_EMAILS_DESDE=AAAA-MM-DD: solo reciben mails los médicos
 * registrados desde esa fecha (evita mandarle la secuencia entera, de golpe, a
 * todos los que ya estaban).
 *
 * Apagada: el cron corre en modo prueba -- calcula a quién le mandaría qué y
 * lo devuelve/loguea, sin mandar nada ni guardar nada.
 */
export function engagementEmailsHabilitados(): boolean {
  return process.env.ENGAGEMENT_EMAILS === "true";
}
