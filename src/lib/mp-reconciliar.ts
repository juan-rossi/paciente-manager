import { prisma } from "@/lib/prisma";

// Un cobro aprobado sobre la preapproval vigente prueba que está AUTHORIZED.
// El webhook ya lo deja así, pero MercadoPago no garantiza el orden de sus
// notificaciones (un "pending" tardío, o un "authorized" que nunca llega,
// dejaba el aviso "Confirmando tu suscripción" colgado con el plan ya
// activo) -- por eso se reconcilia también al consultar el estado. Devuelve
// true si corrigió el estado.
export async function reconciliarPreapprovalPendiente(
  userId: string,
  mpPreapprovalId: string
): Promise<boolean> {
  const cobro = await prisma.pagoSuscripcion.findFirst({
    where: { userId, mpPreapprovalId, estado: "approved" },
    select: { id: true },
  });
  if (!cobro) return false;

  const { count } = await prisma.user.updateMany({
    where: { id: userId, mpPreapprovalId, mpPreapprovalStatus: "PENDING" },
    data: { mpPreapprovalStatus: "AUTHORIZED" },
  });
  return count > 0;
}
