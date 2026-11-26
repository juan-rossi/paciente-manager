import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { getAranceles } from "@/lib/ingresos-server";
import { montosVigentes } from "@/lib/ingresos";
import { startOfDayBA } from "@/lib/timezone";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  asistencia: z.enum(["ASISTIO", "AUSENTE"]),
});

// "Marcar todos" en el reporte de ingresos: marca de una los turnos pasados
// que nadie marcó. Solo toca turnos activos, del médico, de hoy o antes y
// todavía sin marcar -- uno ya marcado (p.ej. por la asistente mientras
// tanto) se respeta.
export async function POST(request: NextRequest) {
  const { user, response } = await requireDoctor({ escritura: true });
  if (response) return response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const finDeHoy = new Date(startOfDayBA(new Date()).getTime() + 24 * 60 * 60 * 1000);
  const turnos = await prisma.turno.findMany({
    where: {
      id: { in: parsed.data.ids },
      doctorId: user.id,
      estado: "CONFIRMADO",
      asistencia: null,
      inicio: { lt: finDeHoy },
    },
    select: { id: true, obraSocial: true },
  });

  if (parsed.data.asistencia === "AUSENTE") {
    await prisma.turno.updateMany({
      where: { id: { in: turnos.map((t) => t.id) } },
      data: { asistencia: "AUSENTE", montoCobertura: null, montoPlus: null },
    });
  } else {
    const aranceles = await getAranceles(user.id);
    await prisma.$transaction(
      turnos.map((t) =>
        prisma.turno.update({
          where: { id: t.id },
          data: { asistencia: "ASISTIO", ...montosVigentes(t.obraSocial, aranceles) },
        })
      )
    );
  }

  return NextResponse.json({ actualizados: turnos.length });
}
