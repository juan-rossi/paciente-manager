import { prisma } from "@/lib/prisma";

export type GastoResumen = {
  id: string;
  fecha: Date;
  descripcion: string;
  monto: number;
};

export async function getGastos(): Promise<GastoResumen[]> {
  return prisma.gasto.findMany({
    select: { id: true, fecha: true, descripcion: true, monto: true },
    orderBy: { fecha: "desc" },
  });
}
