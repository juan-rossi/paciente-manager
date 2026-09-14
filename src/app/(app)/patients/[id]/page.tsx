import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { PatientSummary } from "@/components/patient-summary";
import { patientFromApi } from "@/components/patient-form/utils";
import { computeTurnoDiffs, type TurnoDiff } from "@/lib/patient-turno-diff";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ turnoId?: string }>;
};

export default async function PatientDetailPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const tenantId = getTenantId(user);

  const { id } = await params;
  const { turnoId } = await searchParams;

  const patient = await prisma.patient.findFirst({
    where: { id, doctorId: tenantId, deletedAt: null },
    include: {
      antecedentes: true,
      evoluciones: { where: { deletedAt: null }, orderBy: { fecha: "asc" } },
    },
  });

  if (!patient) {
    notFound();
  }

  // Para el historial de auditoría hace falta buscar TODAS las evoluciones
  // que alguna vez tuvo este paciente (incluidas las eliminadas), no solo
  // las activas -- si no, una evolución borrada desaparecería también de su
  // propio historial de auditoría.
  const evolucionIds = (
    await prisma.patientEvolucion.findMany({ where: { patientId: id }, select: { id: true } })
  ).map((e) => e.id);

  const auditEntries = await prisma.auditLog.findMany({
    where: {
      doctorId: tenantId,
      OR: [
        { entidad: "PACIENTE", entidadId: id },
        ...(evolucionIds.length > 0
          ? [{ entidad: "EVOLUCION" as const, entidadId: { in: evolucionIds } }]
          : []),
      ],
    },
    include: { actor: { select: { nombre: true, apellido: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  let diffs: TurnoDiff[] = [];
  if (turnoId) {
    const turno = await prisma.turno.findFirst({
      where: { id: turnoId, doctorId: tenantId },
      select: { nombreYApellido: true, dni: true, telefono: true, obraSocial: true },
    });
    if (turno) {
      diffs = computeTurnoDiffs(patient, turno);
    }
  }

  const { values: patientValues } = patientFromApi(patient);

  return (
    <PatientSummary
      patient={patient}
      diffs={diffs}
      patientValues={patientValues}
      auditEntries={auditEntries}
    />
  );
}
