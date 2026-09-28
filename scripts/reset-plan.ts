import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Resetea el plan de un médico a un estado de trial "limpio" -- sin plan
// pago, sin preapproval/pago único en curso -- para volver a probar el
// flujo de pago de MercadoPago desde cero. Pensado solo para
// desarrollo/QA (ver skill `reset_plan`), nunca para producción real.
//
// Sin DOCTOR_EMAIL: lista los DOCTOR de esa base (para elegir uno).
// Con DOCTOR_EMAIL: resetea esa cuenta. TRIAL_DIAS_RESTANTES opcional
// (default 60 = trial fresco); un número menor simula estar a esa
// cantidad de días de que se corte el acceso.
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

  const diasRestantesRaw = process.env.TRIAL_DIAS_RESTANTES;
  const diasRestantes = diasRestantesRaw ? Number(diasRestantesRaw) : 60;
  if (!Number.isFinite(diasRestantes) || diasRestantes <= 0) {
    throw new Error("TRIAL_DIAS_RESTANTES debe ser un número mayor a 0.");
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + diasRestantes);

  const actualizado = await prisma.user.update({
    where: { email },
    data: {
      plan: "BASICA",
      trialEndsAt,
      planDuracion: null,
      planEndsAt: null,
      planPendiente: null,
      planDuracionPendiente: null,
      mpPreapprovalId: null,
      mpPreapprovalStatus: null,
      pagoEnGracia: false,
      graciaVenceEl: null,
    },
    select: {
      email: true,
      nombre: true,
      apellido: true,
      plan: true,
      trialEndsAt: true,
      planEndsAt: true,
      mpPreapprovalStatus: true,
    },
  });

  console.log(JSON.stringify(actualizado, null, 2));
  await prisma.$disconnect();
}

main();
