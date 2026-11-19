import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { inicioDeMes, labelMes, mesActual, sumarMeses } from "@/lib/admin-costos-ia";
import { topeIAEfectivo } from "@/lib/ia-costos";

// Tope de gasto mensual en IA (ver `TOPE_IA_USD_DEFAULT` en
// src/lib/ia-costos.ts).
//
// Cada pedido a un proveedor se RESERVA antes de llamarlo: una fila de
// `UsoIA` con el costo máximo estimado, creada bajo un lock por médico
// después de verificar el tope. Así un pedido simultáneo ve los que están en
// curso. Antes el costo se registraba recién al volver el proveedor
// (segundos después), y N pedidos en paralelo pasaban todos el chequeo: el
// exceso sobre el tope no tenía límite. Al responder el proveedor la reserva
// se confirma con el costo real (también si se negó o devolvió vacío: igual
// se paga); si falló sin cobrar, se libera.

type Cliente = Prisma.TransactionClient | typeof prisma;

async function gastoIAMesUsd(doctorId: string, cliente: Cliente = prisma): Promise<number> {
  const mes = mesActual();
  const agregado = await cliente.usoIA.aggregate({
    where: { doctorId, createdAt: { gte: inicioDeMes(mes), lt: inicioDeMes(sumarMeses(mes, 1)) } },
    _sum: { costoUsd: true },
  });
  return agregado._sum.costoUsd ?? 0;
}

// Chequeo barato previo (lo usa `requirePremiumDoctor` y /api/ia/disponible):
// corta temprano al médico que ya llegó al tope. El que vale para cada pedido
// es el de `reservarUsoIA`.
export async function alcanzoTopeIA(doctor: { id: string; topeIAUsd: number | null }): Promise<boolean> {
  return (await gastoIAMesUsd(doctor.id)) >= topeIAEfectivo(doctor);
}

/**
 * Reserva un uso de IA antes de llamar al proveedor. Devuelve el id de la
 * reserva, o `null` si el médico ya alcanzó el tope (contando los pedidos en
 * curso). Como hasta ahora, el pedido que cruza el tope pasa; el exceso queda
 * acotado a ese único pedido.
 */
export async function reservarUsoIA(
  doctor: { id: string; topeIAUsd: number | null },
  tipo: "DICTADO" | "RESUMEN",
  costoEstimadoUsd: number
): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    // Serializa las reservas de un mismo médico (se libera al terminar la
    // transacción): dos pedidos simultáneos no pueden leer el mismo gasto.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`uso-ia:${doctor.id}`}))`;
    if ((await gastoIAMesUsd(doctor.id, tx)) >= topeIAEfectivo(doctor)) return null;
    const reserva = await tx.usoIA.create({
      data: { doctorId: doctor.id, tipo, costoUsd: costoEstimadoUsd },
      select: { id: true },
    });
    return reserva.id;
  });
}

// Confirmar/liberar nunca deben hacer fallar el pedido del médico: ante un
// error solo se loguea (una reserva sin confirmar queda con el costo
// estimado, que es el máximo: cuenta de más, nunca de menos).
export async function confirmarUsoIA(
  reservaId: string,
  datos: { costoUsd: number; segundosAudio?: number; tokensEntrada?: number; tokensSalida?: number }
) {
  try {
    await prisma.usoIA.update({ where: { id: reservaId }, data: datos });
  } catch (error) {
    console.error("[ia-tope] No se pudo confirmar el uso de IA", { reservaId, error });
  }
}

export async function liberarUsoIA(reservaId: string) {
  try {
    await prisma.usoIA.delete({ where: { id: reservaId } });
  } catch (error) {
    console.error("[ia-tope] No se pudo liberar la reserva de IA", { reservaId, error });
  }
}

export function mensajeTopeIA(): string {
  // labelMes da "Noviembre 2026": solo el nombre del mes.
  const mes = labelMes(sumarMeses(mesActual(), 1)).split(" ")[0].toLowerCase();
  return `Alcanzaste el límite mensual de uso de las funciones de IA. Vuelven a estar disponibles el 1 de ${mes}.`;
}
