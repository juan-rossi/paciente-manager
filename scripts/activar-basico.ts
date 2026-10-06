import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Deja a un médico como si ya estuviera pagando una suscripción MENSUAL
// recurrente del plan Básico -- útil para probar la UI de "plan activo"
// (tarjeta de funciones + botón de cancelar) sin tener que pasar por
// MercadoPago. El `mpPreapprovalId` es un placeholder local, no existe en
// MercadoPago real -- "Cancelar suscripción" fallaría contra su API si se
// prueba con esta cuenta (ver skill `reset_basico`).
//
// Sin DOCTOR_EMAIL: lista los DOCTOR de esa base (para elegir uno). Con
// DOCTOR_EMAIL: activa esa cuenta.
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

  const planEndsAt = new Date();
  planEndsAt.setMonth(planEndsAt.getMonth() + 1);

  const actualizado = await prisma.user.update({
    where: { email },
    data: {
      plan: "BASICA",
      planDuracion: "MENSUAL",
      planEndsAt,
      mpPreapprovalId: `local-test-preapproval-${Date.now()}`,
      mpPreapprovalStatus: "AUTHORIZED",
      planPendiente: null,
      planDuracionPendiente: null,
      pagoEnGracia: false,
      graciaVenceEl: null,
    },
    select: {
      email: true,
      nombre: true,
      apellido: true,
      plan: true,
      planDuracion: true,
      planEndsAt: true,
      mpPreapprovalStatus: true,
      mpPreapprovalId: true,
    },
  });

  console.log(JSON.stringify(actualizado, null, 2));
  await prisma.$disconnect();
}

main();
