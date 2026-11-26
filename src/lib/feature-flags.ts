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
 */
export function teleconsultaHabilitada(): boolean {
  return process.env.TELECONSULTA_HABILITADA === "true";
}
