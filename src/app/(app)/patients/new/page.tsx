import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { esActivo, isPremium } from "@/lib/plan";
import { getResumenAutomatico } from "@/lib/resumen-automatico";
import { PatientForm } from "@/components/patient-form/patient-form";
import { emptyPatientFormValues } from "@/components/patient-form/utils";
import { PageEnter } from "@/components/page-transition";
import { getTenantId } from "@/lib/tenant";
import { tenantEsOdontologo } from "@/lib/odontograma-server";
import { tenantEspecialidad } from "@/lib/especialidad-server";
import { grupoEspecialidad, usaExamenFisico } from "@/lib/especialidad";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  // La historia clínica es solo del médico: un asistente nunca la ve (el
  // proxy ya la saca de /patients, esto es la segunda barrera).
  if (!user || user.role !== "DOCTOR") notFound();
  const params = await searchParams;
  const especialidad = await tenantEspecialidad(getTenantId(user));
  const grupo = grupoEspecialidad(especialidad);
  const initialValues = emptyPatientFormValues(grupo);
  initialValues.nombreYApellido = firstString(params.nombreYApellido) ?? "";
  initialValues.nroDocumento = firstString(params.nroDocumento) ?? "";
  initialValues.telefono = firstString(params.telefono) ?? "";
  initialValues.obraSocial = firstString(params.obraSocial) ?? "";
  const odontogramaHabilitado = await tenantEsOdontologo(getTenantId(user));
  const examenFisicoHabilitado = usaExamenFisico(especialidad);

  return (
    <PageEnter>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Nuevo paciente</h1>
        <PatientForm
          mode="create"
          initialValues={initialValues}
          transcripcionHabilitada={isPremium(user) && esActivo(user)}
          resumenAutomatico={await getResumenAutomatico(user)}
          odontogramaHabilitado={odontogramaHabilitado}
          examenFisicoHabilitado={examenFisicoHabilitado}
          grupo={grupo}
        />
      </div>
    </PageEnter>
  );
}
