import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/components/patient-form/patient-form";
import { patientFromApi } from "@/components/patient-form/utils";

type Props = { params: Promise<{ id: string }> };

export default async function EditPatientPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, doctorId: getTenantId(user), deletedAt: null },
    include: {
      antecedentes: true,
      // Sin filtro de deletedAt acá a propósito: la pestaña de evolución
      // muestra también las eliminadas (atenuadas) para poder restaurarlas.
      evoluciones: { orderBy: { fecha: "asc" } },
    },
  });

  if (!patient) {
    notFound();
  }

  const { values, evoluciones, evolucionesEliminadas } = patientFromApi(patient);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/patients/${patient.id}`} />}
        >
          <ArrowLeft className="size-4" />
          Volver a detalle
        </Button>
      </div>
      <h1 className="text-2xl font-semibold">{patient.nombreYApellido}</h1>
      <PatientForm
        mode="edit"
        patientId={patient.id}
        initialValues={values}
        initialEvoluciones={evoluciones}
        initialEvolucionesEliminadas={evolucionesEliminadas}
      />
    </div>
  );
}
