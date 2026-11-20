import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Ejecuta `fn` en una transacción que tiene tomada la agenda del médico: dos
 * altas simultáneas de turnos del mismo médico (dos asistentes, el asistente
 * y el médico, o dos pacientes reservando online) se ejecutan de a una.
 *
 * Sin esto, "¿ese horario está libre?" y "crear el turno" eran dos pasos
 * separados: dos pedidos al mismo tiempo veían el horario libre y ambos lo
 * tomaban (o superaban el límite de un sobreturno por horario). No alcanza
 * con un índice único: un horario puede tener legítimamente dos filas (turno +
 * sobreturno) y no hay columna que las distinga.
 *
 * El lock (`pg_advisory_xact_lock`) se libera solo al terminar la
 * transacción. Dentro de `fn` hay que usar `tx`, no `prisma`.
 */
export async function conAgendaDelMedico<T>(
  doctorId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`agenda:${doctorId}`}))`;
    return fn(tx);
  });
}
