import { prisma } from "@/lib/prisma";
import type { Aranceles } from "@/lib/ingresos";

/** Aranceles vigentes del médico (consulta particular + por cobertura). */
export async function getAranceles(doctorId: string): Promise<Aranceles> {
  const [doctor, coberturas] = await Promise.all([
    prisma.user.findUnique({ where: { id: doctorId }, select: { montoConsultaParticular: true } }),
    prisma.doctorPrepaga.findMany({
      where: { doctorId },
      select: { montoConsulta: true, montoPlus: true, prepaga: { select: { nombre: true } } },
    }),
  ]);
  return {
    particular: doctor?.montoConsultaParticular ?? null,
    porCobertura: Object.fromEntries(
      coberturas.map((c) => [c.prepaga.nombre, { consulta: c.montoConsulta, plus: c.montoPlus }])
    ),
  };
}
