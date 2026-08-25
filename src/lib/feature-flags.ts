/**
 * Esconde/muestra turnos y configuración (nav, rutas y accesos) por ambiente.
 * Se lee de NEXT_PUBLIC_ para poder usarse también en componentes cliente (ej. login-form).
 */
export const TURNOS_ENABLED = process.env.NEXT_PUBLIC_TURNOS_ENABLED === "true";
