import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { MESES_POR_DURACION, precioTotalDuracion } from "../src/lib/plan";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Deja a un médico como si hubiera hecho un pago ÚNICO de 6 meses del plan
// Premium (sin pasar por MercadoPago), con `DIAS_RESTANTES` días de acceso por
// delante -- útil para probar el aviso de "plan por vencer" (ámbar a 13 días,
// rojo a 2) y el flujo de renovación (ver skill `reset_premium`).
//
// Sin DOCTOR_EMAIL: lista los DOCTOR de esa base (para elegir uno). Con
// DOCTOR_EMAIL: aplica el estado a esa cuenta.
async function main() {
  const email = process.env.DOCTOR_EMAIL?.trim().toLowerCase();

  if (!email) {
    const doctores = await prisma.user.findMany({
      where: { role: "DOCTOR" },
      select: {
        email: true,
        nombre: true,
        apellido: true,
        plan: true,
        planDuracion: true,
        trialEndsAt: true,
        planEndsAt: true,
        mpPreapprovalStatus: true,
      },
      orderBy: { createdAt: "desc" },
    });
    console.log(JSON.stringify(doctores, null, 2));
    await prisma.$disconnect();
    return;
  }

  const dias = Number(process.env.DIAS_RESTANTES);
  if (!Number.isInteger(dias) || dias < 1) {
    throw new Error("DIAS_RESTANTES tiene que ser un entero mayor o igual a 1");
  }

  const planEndsAt = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  const monto = precioTotalDuracion("PREMIUM", "SEMESTRAL");

  const [, actualizado] = await prisma.$transaction([
    // Mismo registro que deja el webhook para un pago único (sin preapproval).
    prisma.pagoSuscripcion.create({
      data: {
        userId: user.id,
        mpPaymentId: `local-test-payment-${Date.now()}`,
        mpPreapprovalId: null,
        monto,
        estado: "approved",
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        plan: "PREMIUM",
        planDuracion: "SEMESTRAL",
        planEndsAt,
        mpPreapprovalId: null,
        mpPreapprovalStatus: null,
        planPendiente: null,
        planDuracionPendiente: null,
        pagoEnGracia: false,
        graciaVenceEl: null,
        cancelacionMotivo: null,
        cancelacionDetalle: null,
        canceladaEl: null,
      },
      select: {
        email: true,
        nombre: true,
        apellido: true,
        plan: true,
        planDuracion: true,
        planEndsAt: true,
        mpPreapprovalStatus: true,
      },
    }),
  ]);

  console.log(
    JSON.stringify({ ...actualizado, mesesPagados: MESES_POR_DURACION.SEMESTRAL, monto, diasRestantes: dias }, null, 2)
  );
  await prisma.$disconnect();
}

main();
