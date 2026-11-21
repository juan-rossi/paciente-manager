import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { esActivo, isPremium } from "@/lib/plan";
import { getResumenAutomatico } from "@/lib/resumen-automatico";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/components/patient-form/patient-form";
import { patientFromApi, tieneExamenFisicoCargado } from "@/components/patient-form/utils";
import { PageEnter } from "@/components/page-transition";
import { odontogramaFromApi } from "@/components/patient-form/utils";
import { tenantEsOdontologo } from "@/lib/odontograma-server";
import { tenantEspecialidad } from "@/lib/especialidad-server";
import { grupoEspecialidad, usaExamenFisico } from "@/lib/especialidad";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function EditPatientPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  // La historia clínica es solo del médico: un asistente nunca la ve (el
  // proxy ya la saca de /patients, esto es la segunda barrera).
  if (!user || user.role !== "DOCTOR") notFound();

  const { id } = await params;
  const { tab } = await searchParams;

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

  const especialidad = await tenantEspecialidad(patient.doctorId);
  const grupo = grupoEspecialidad(especialidad);
  const { values, evoluciones, evolucionesEliminadas } = patientFromApi(patient, grupo);
  const resumenAutomatico = await getResumenAutomatico(user);
  const odontogramaHabilitado = await tenantEsOdontologo(patient.doctorId);
  // Las especialidades con examen propio no usan el físico, salvo que este
  // paciente ya tenga algo cargado ahí (ver tieneExamenFisicoCargado()).
  const examenFisicoHabilitado = usaExamenFisico(especialidad) || tieneExamenFisicoCargado(patient, grupo);
  const odontogramas = odontogramaHabilitado
    ? await prisma.patientOdontograma.findMany({
        where: { patientId: patient.id, deletedAt: null },
        orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
        include: {
          practicas: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        },
      })
    : [];

  return (
    <PageEnter>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">{patient.nombreYApellido}</h1>
          <div className="flex flex-wrap items-center gap-2">
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
        </div>
        <PatientForm
          mode="edit"
          patientId={patient.id}
          initialValues={values}
          initialEvoluciones={evoluciones}
          initialEvolucionesEliminadas={evolucionesEliminadas}
          transcripcionHabilitada={isPremium(user) && esActivo(user)}
          resumenAutomatico={resumenAutomatico}
          odontogramaHabilitado={odontogramaHabilitado}
          examenFisicoHabilitado={examenFisicoHabilitado}
          grupo={grupo}
          initialOdontogramas={odontogramas.map(odontogramaFromApi)}
          initialTab={tab}
        />
      </div>
    </PageEnter>
  );
}
