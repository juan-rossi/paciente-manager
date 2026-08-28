import { PatientForm } from "@/components/patient-form/patient-form";
import { emptyPatientFormValues } from "@/components/patient-form/utils";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const initialValues = emptyPatientFormValues();
  initialValues.nombreYApellido = firstString(params.nombreYApellido) ?? "";
  initialValues.nroDocumento = firstString(params.nroDocumento) ?? "";
  initialValues.telefono = firstString(params.telefono) ?? "";
  initialValues.obraSocial = firstString(params.obraSocial) ?? "";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo paciente</h1>
      <PatientForm mode="create" initialValues={initialValues} />
    </div>
  );
}
