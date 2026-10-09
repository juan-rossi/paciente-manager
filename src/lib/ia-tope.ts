import { prisma } from "@/lib/prisma";
import { inicioDeMes, labelMes, mesActual, sumarMeses } from "@/lib/admin-costos-ia";
import { topeIAEfectivo } from "@/lib/ia-costos";

// Chequeo del tope de gasto mensual en IA (ver `TOPE_IA_USD_DEFAULT` en
// src/lib/ia-costos.ts) que hace `requirePremiumDoctor` antes de cada pedido
// a `/api/ia/*`.

async function gastoIAMesUsd(doctorId: string): Promise<number> {
  const mes = mesActual();
  const agregado = await prisma.usoIA.aggregate({
    where: { doctorId, createdAt: { gte: inicioDeMes(mes), lt: inicioDeMes(sumarMeses(mes, 1)) } },
    _sum: { costoUsd: true },
  });
  return agregado._sum.costoUsd ?? 0;
}

// Se chequea antes de llamar al proveedor: el pedido que cruza el tope pasa
// (el costo recién se conoce después), los siguientes se bloquean.
export async function alcanzoTopeIA(doctor: { id: string; topeIAUsd: number | null }): Promise<boolean> {
  return (await gastoIAMesUsd(doctor.id)) >= topeIAEfectivo(doctor);
}

export function mensajeTopeIA(): string {
  // labelMes da "Noviembre 2026": solo el nombre del mes.
  const mes = labelMes(sumarMeses(mesActual(), 1)).split(" ")[0].toLowerCase();
  return `Alcanzaste el límite mensual de uso de las funciones de IA. Vuelven a estar disponibles el 1 de ${mes}.`;
}
