// Claves de localStorage del modal "Pago confirmado" (ver
// `src/components/pago-confirmado-modal.tsx`).
//
// BASELINE: id del último pago confirmado que había ANTES de arrancar el
// checkout (lo devuelve `/api/mercadopago/checkout`). El modal solo celebra un
// pago distinto a este -- así, volver de un checkout abandonado no celebra un
// pago viejo. Sin baseline (p.ej. el signup, que no lo guarda) alcanza con que
// el pago sea reciente.
export const PAGO_BASELINE_KEY = "mp_pago_baseline";
// CELEBRADO: id del último pago que ya se celebró, para no repetir la
// animación si se recarga la página.
export const PAGO_CELEBRADO_KEY = "mp_pago_celebrado";
// Un pago más viejo que esto no se considera "recién confirmado".
export const PAGO_RECIENTE_MS = 30 * 60 * 1000;
// INICIO: timestamp (ms) de cuando el médico salió hacia el checkout. Es el
// respaldo de `?pago=retorno`: si MercadoPago no conserva los query params del
// `back_url`, igual se sabe que la persona acaba de volver de un checkout.
export const PAGO_INICIO_KEY = "mp_pago_inicio";
// Ventana en la que volver a /configuracion cuenta como "retorno del checkout".
export const PAGO_RETORNO_MS = 30 * 60 * 1000;
