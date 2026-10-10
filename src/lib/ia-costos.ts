import { prisma } from "@/lib/prisma";

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

// Registrar el uso nunca debe hacer fallar el pedido del médico: el dictado o
// el resumen ya se generó (y se pagó), así que ante un error solo se loguea.
export async function registrarDictado(doctorId: string, segundosAudio: number) {
  try {
    await prisma.usoIA.create({
      data: {
        doctorId,
        tipo: "DICTADO",
        segundosAudio,
        costoUsd: costoDictadoUsd(segundosAudio),
      },
    });
  } catch (error) {
    console.error("[ia-costos] No se pudo registrar el dictado", error);
  }
}

export async function registrarResumen(doctorId: string, tokensEntrada: number, tokensSalida: number) {
  try {
    await prisma.usoIA.create({
      data: {
        doctorId,
        tipo: "RESUMEN",
        tokensEntrada,
        tokensSalida,
        costoUsd: costoResumenUsd(tokensEntrada, tokensSalida),
      },
    });
  } catch (error) {
    console.error("[ia-costos] No se pudo registrar el resumen", error);
  }
}
