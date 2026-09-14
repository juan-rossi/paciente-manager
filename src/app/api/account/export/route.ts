import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";

// Ley 26.529 art. 18: el depositario legal de la historia clínica es el
// profesional (no la plataforma) -- si un médico deja Semio360, necesita
// poder llevarse una copia completa de todo lo que atendió para seguir
// cumpliendo su propia obligación de guarda de 10 años, fuera de la app.
// Incluye TODO (incluidos los registros dados de baja vía soft-delete):
// ocultarlos de la UI del día a día no significa que dejen de ser parte de
// la historia clínica que el médico debe conservar.
export async function GET() {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const [doctor, pacientes, turnos] = await Promise.all([
    prisma.user.findUnique({
      where: { id: tenantId },
      select: { nombre: true, apellido: true, email: true, nroMatricula: true },
    }),
    prisma.patient.findMany({
      where: { doctorId: tenantId },
      include: {
        antecedentes: true,
        evoluciones: { orderBy: { fecha: "asc" } },
        consentimientos: { orderBy: { fecha: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.turno.findMany({
      where: { doctorId: tenantId },
      orderBy: { inicio: "asc" },
    }),
  ]);

  if (pacientes.length > 0) {
    await prisma.auditLog.createMany({
      data: pacientes.map((p) => ({
        doctorId: tenantId,
        actorId: user.id,
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
