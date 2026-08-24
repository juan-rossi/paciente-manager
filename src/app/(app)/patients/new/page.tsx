import { PatientForm } from "@/components/patient-form/patient-form";

export default function NewPatientPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nuevo paciente</h1>
      <PatientForm mode="create" />
    </div>
  );
}
