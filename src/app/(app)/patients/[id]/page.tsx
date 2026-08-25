import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PatientSummary } from "@/components/patient-summary";

type Props = { params: Promise<{ id: string }> };

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params;

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

  return <PatientSummary patient={patient} />;
}
