import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PatientSummary } from "@/components/patient-summary";
import { patientFromApi } from "@/components/patient-form/utils";
import { computeTurnoDiffs, type TurnoDiff } from "@/lib/patient-turno-diff";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ turnoId?: string }>;
};

export default async function PatientDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { turnoId } = await searchParams;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      antecedentes: true,
      evoluciones: { orderBy: { fecha: "asc" } },
    },
  });

  if (!patient) {
    notFound();
  }

  let diffs: TurnoDiff[] = [];
  if (turnoId) {
    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      select: { nombreYApellido: true, dni: true, telefono: true, obraSocial: true },
    });
    if (turno) {
      diffs = computeTurnoDiffs(patient, turno);
    }
  }

  const { values: patientValues } = patientFromApi(patient);

  return <PatientSummary patient={patient} diffs={diffs} patientValues={patientValues} />;
}
