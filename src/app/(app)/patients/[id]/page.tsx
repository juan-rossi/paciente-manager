import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PatientForm } from "@/components/patient-form/patient-form";
import { patientFromApi } from "@/components/patient-form/utils";

type Props = { params: Promise<{ id: string }> };

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      antecedentes: true,
      evoluciones: { orderBy: { fecha: "desc" } },
    },
  });

  if (!patient) {
    notFound();
  }

  const { values, evoluciones } = patientFromApi(patient);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{patient.nombreYApellido}</h1>
      <PatientForm
        mode="edit"
        patientId={patient.id}
        initialValues={values}
        initialEvoluciones={evoluciones}
      />
    </div>
  );
}
