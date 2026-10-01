import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { GRACIA_DIAS, precioMensualEquivalente, precioTotalDuracion } from "../src/lib/plan";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DIA_MS = 24 * 60 * 60 * 1000;

// Deja a un médico con el plan Básico YA CADUCADO (sin acceso), para probar
// la UI de plan vencido y el flujo de reactivación (ver skill `finish_basico`).
// Dos escenarios, según `ESCENARIO`:
//   - UNICO: había hecho un pago único (6 meses) y el período terminó. Sin
//     preapproval, nada que reintentar.
//   - SUSCRIPCION: tenía suscripción mensual recurrente pero el cobro del mes
//     siguiente falló; la gracia (`GRACIA_DIAS`) también ya venció y
//     MercadoPago dejó la preapproval en PAUSED.
//
// En ambos casos `planEndsAt` y `trialEndsAt` quedan en el pasado (si el trial
// siguiera vigente, `esActivo()` daría true y la cuenta no estaría caducada).
//
// Sin DOCTOR_EMAIL: lista los DOCTOR de esa base. Con DOCTOR_EMAIL: aplica.
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

  const escenario = process.env.ESCENARIO?.trim().toUpperCase();
  if (escenario !== "UNICO" && escenario !== "SUSCRIPCION") {
    throw new Error("ESCENARIO tiene que ser UNICO o SUSCRIPCION");
  }

  // `PLAN` es opcional (default BASICA); la skill `finish_premium` usa PREMIUM.
  const plan = (process.env.PLAN?.trim().toUpperCase() || "BASICA") as "BASICA" | "PREMIUM";
  if (plan !== "BASICA" && plan !== "PREMIUM") {
    throw new Error("PLAN tiene que ser BASICA o PREMIUM");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  const ahora = Date.now();
  const trialEndsAt = new Date(ahora - 30 * DIA_MS);

  const select = {
    email: true,
    nombre: true,
    apellido: true,
    plan: true,
    planDuracion: true,
    planEndsAt: true,
    trialEndsAt: true,
    mpPreapprovalStatus: true,
    pagoEnGracia: true,
    graciaVenceEl: true,
  } as const;

  const base = {
    plan,
    trialEndsAt,
    planPendiente: null,
    planDuracionPendiente: null,
    cancelacionMotivo: null,
    cancelacionDetalle: null,
    canceladaEl: null,
  };

  if (escenario === "UNICO") {
    const monto = precioTotalDuracion(plan, "SEMESTRAL");
    const [, actualizado] = await prisma.$transaction([
      prisma.pagoSuscripcion.create({
        data: {
          userId: user.id,
          mpPaymentId: `local-test-payment-${ahora}`,
          mpPreapprovalId: null,
          monto,
          estado: "approved",
          createdAt: new Date(ahora - 181 * DIA_MS),
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          ...base,
          planDuracion: "SEMESTRAL",
          planEndsAt: new Date(ahora - DIA_MS),
          mpPreapprovalId: null,
          mpPreapprovalStatus: null,
          pagoEnGracia: false,
          graciaVenceEl: null,
        },
        select,
      }),
    ]);
    console.log(JSON.stringify({ escenario, ...actualizado, monto }, null, 2));
  } else {
    const monto = precioMensualEquivalente(plan, "MENSUAL");
    const graciaVenceEl = new Date(ahora - DIA_MS);
    const preapprovalId = `local-test-preapproval-${ahora}`;
    const [, , actualizado] = await prisma.$transaction([
      // Último cobro que sí entró (hace ~1 mes)...
      prisma.pagoSuscripcion.create({
        data: {
          userId: user.id,
          mpPaymentId: `local-test-payment-ok-${ahora}`,
          mpPreapprovalId: preapprovalId,
          monto,
          estado: "approved",
          createdAt: new Date(ahora - (30 + GRACIA_DIAS + 1) * DIA_MS),
        },
      }),
      // ...y el siguiente, que fue rechazado.
      prisma.pagoSuscripcion.create({
        data: {
          userId: user.id,
          mpPaymentId: `local-test-payment-rejected-${ahora}`,
          mpPreapprovalId: preapprovalId,
          monto,
          estado: "rejected",
          createdAt: new Date(ahora - (GRACIA_DIAS + 1) * DIA_MS),
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          ...base,
          planDuracion: "MENSUAL",
          planEndsAt: graciaVenceEl,
          mpPreapprovalId: preapprovalId,
          mpPreapprovalStatus: "PAUSED",
          pagoEnGracia: true,
          graciaVenceEl,
        },
        select,
      }),
    ]);
    console.log(JSON.stringify({ escenario, ...actualizado, monto }, null, 2));
  }

  await prisma.$disconnect();
}

main();
