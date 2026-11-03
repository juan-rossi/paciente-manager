import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Ley 26.529 art. 18: el depositario legal de la historia clínica es el
// profesional (no la plataforma) -- si un médico deja Semio360, necesita
// poder llevarse una copia completa de todo lo que atendió para seguir
// cumpliendo su propia obligación de guarda de 10 años, fuera de la app.
// Incluye TODO (incluidos los registros dados de baja vía soft-delete):
// ocultarlos de la UI del día a día no significa que dejen de ser parte de
// la historia clínica que el médico debe conservar.
//
// Lo usan "Mis datos" (el propio médico) y la ficha de /admin/medicos para un
// médico suspendido que pide su copia por mail. `actorId` es quien la
// descarga, para la auditoría.
export async function exportarHistoriaClinica(doctorId: string, actorId: string): Promise<NextResponse> {
  const [doctor, pacientes, turnos] = await Promise.all([
    prisma.user.findUnique({
      where: { id: doctorId },
      select: { nombre: true, apellido: true, email: true, nroMatricula: true },
    }),
    prisma.patient.findMany({
      where: { doctorId },
      include: {
        antecedentes: true,
        evoluciones: { orderBy: { fecha: "asc" } },
        consentimientos: { orderBy: { fecha: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.turno.findMany({
      where: { doctorId },
      orderBy: { inicio: "asc" },
    }),
  ]);

  if (pacientes.length > 0) {
    await prisma.auditLog.createMany({
      data: pacientes.map((p) => ({
        doctorId,
        actorId,
        accion: "EXPORTAR" as const,
        entidad: "PACIENTE" as const,
        entidadId: p.id,
      })),
    });
  }

  const payload = {
    generadoEl: new Date().toISOString(),
    medico: doctor,
    pacientes,
    turnos,
  };

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="semio360-historia-clinica-completa-${fecha}.json"`,
    },
  });
}
