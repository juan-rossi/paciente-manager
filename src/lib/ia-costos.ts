
// Precios en USD de los proveedores de IA -- se usan para congelar el costo de
// cada uso en `UsoIA.costoUsd` al momento de registrarlo. Si un proveedor
// cambia el precio, actualizar acá: los meses ya registrados no cambian.

// Groq, whisper-large-v3-turbo: US$ 0,04 por hora de audio, con un mínimo
// facturado de 10 segundos por pedido (https://groq.com/pricing).
const GROQ_USD_POR_HORA = 0.04;
const GROQ_SEGUNDOS_MINIMOS = 10;

// Anthropic, claude-haiku-4-5: US$ 1 por millón de tokens de entrada y US$ 5
// por millón de salida.
const HAIKU_USD_POR_MTOK_ENTRADA = 1;
const HAIKU_USD_POR_MTOK_SALIDA = 5;

export function costoDictadoUsd(segundosAudio: number): number {
  return (Math.max(segundosAudio, GROQ_SEGUNDOS_MINIMOS) / 3600) * GROQ_USD_POR_HORA;
}

export function costoResumenUsd(tokensEntrada: number, tokensSalida: number): number {
  return (
    (tokensEntrada * HAIKU_USD_POR_MTOK_ENTRADA + tokensSalida * HAIKU_USD_POR_MTOK_SALIDA) / 1_000_000
  );
}

// Tope de gasto en IA por médico y por mes calendario (hora de Argentina),
// sumando dictado y resumen. Se puede pisar por médico con `User.topeIAUsd`
// desde /admin. El médico no ve el tope: solo recibe un error al alcanzarlo.
// El chequeo contra el gasto del mes está en src/lib/ia-tope.ts.
export const TOPE_IA_USD_DEFAULT = 20;

export function topeIAEfectivo(doctor: { topeIAUsd: number | null }): number {
  return doctor.topeIAUsd ?? TOPE_IA_USD_DEFAULT;
}

// Costo MÁXIMO estimado de un pedido, para reservarlo antes de llamar al
// proveedor (ver `reservarUsoIA` en src/lib/ia-tope.ts). Tiene que ser una
// cota superior: al volver el proveedor se reemplaza por el costo real.

// El cliente graba a ~24 kbps (3.000 bytes por segundo de audio); se toma
// 2.000 para quedar holgado ante otros codecs.
const BYTES_POR_SEGUNDO_MINIMO = 2000;

export function costoDictadoMaximoUsd(bytesAudio: number): number {
  return costoDictadoUsd(Math.ceil(bytesAudio / BYTES_POR_SEGUNDO_MINIMO));
}

// En español un token es ~3-4 caracteres: dividir por 2 es holgado. Se suma
// el system prompt, que no viene en el texto.
const TOKENS_SYSTEM_PROMPT = 2000;

export function costoResumenMaximoUsd(caracteresTexto: number, maxTokensSalida: number): number {
  return costoResumenUsd(Math.ceil(caracteresTexto / 2) + TOKENS_SYSTEM_PROMPT, maxTokensSalida);
}
