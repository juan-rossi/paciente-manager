// Interruptor global de los pagos con MercadoPago. Mientras no haya una cuenta
// real, NEXT_PUBLIC_PAGOS_HABILITADOS queda sin setear (o != "true") y todos
// los botones que llevan a pagar se deshabilitan. Al contar con la cuenta real
// alcanza con cargar las API keys y poner la variable en "true".
// Es NEXT_PUBLIC_ porque la leen client components; Next la inlinea en el
// build, así que cambiarla requiere un nuevo deploy.
export const PAGOS_HABILITADOS = process.env.NEXT_PUBLIC_PAGOS_HABILITADOS === "true";

export const PAGOS_LABEL_DESHABILITADO = "Próximamente";
