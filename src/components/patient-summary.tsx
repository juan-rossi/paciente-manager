import Link from "next/link";
import {
  ClipboardCheck,
  History,
  IdCard,
  MessageSquareText,
  NotebookPen,
  Pencil,
} from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/patient-form/fields";
import { ANTECEDENTES_ORDEN } from "@/components/patient-form/constants";
import { calcularEdad } from "@/components/patient-form/utils";
import type { EvolucionValue } from "@/components/patient-form/types";
import { EvolucionManager } from "@/components/evolucion-manager";
import { DeletePatientButton } from "@/components/delete-patient-button";

type PatientWithRelations = Prisma.PatientGetPayload<{
  include: { antecedentes: true; evoluciones: true };
}>;

const ANTECEDENTE_LABELS = new Map(ANTECEDENTES_ORDEN.map((a) => [a.tipo, a.label]));

function InfoField({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value && value.trim() ? value : "—"}</span>
    </div>
  );
}

export function PatientSummary({ patient }: { patient: PatientWithRelations }) {
  const edad = calcularEdad(patient.fechaNacimiento?.toISOString() ?? "");
  const antecedentesPositivos = patient.antecedentes.filter((a) => a.respuesta);
  const tieneDiagnostico =
    Boolean(patient.diagnosticoPresuntivo?.trim()) ||
    Boolean(patient.metodosComplementarios?.trim()) ||
    Boolean(patient.tratamiento?.trim());

  const evolucionValues: EvolucionValue[] = patient.evoluciones.map((e) => ({
    id: e.id,
    fecha: e.fecha.toISOString().slice(0, 10),
    contenido: e.contenido,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{patient.nombreYApellido}</h1>
        <div className="flex items-center gap-2">
          <DeletePatientButton patientId={patient.id} patientName={patient.nombreYApellido} />
          <Button nativeButton={false} render={<Link href={`/patients/${patient.id}/edit`} />}>
            <Pencil className="size-4" />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <FormSection title="Información del Paciente" icon={IdCard} contentClassName="bg-card">
            <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-12">
              <InfoField
                label="Nombre y Apellido"
                value={patient.nombreYApellido}
                className="sm:col-span-4"
              />
              <InfoField
                label="Edad"
                value={edad ? `${edad} años` : null}
                className="sm:col-span-2"
              />
              <InfoField label="Obra Social" value={patient.obraSocial} className="sm:col-span-3" />
              <InfoField
                label="Nro Obra Social"
                value={patient.obraSocialNro}
                className="sm:col-span-3"
              />
            </div>
          </FormSection>

          {Boolean(patient.motivoConsulta?.trim()) && (
            <FormSection
              title="Motivo de Consulta"
              icon={MessageSquareText}
              contentClassName="bg-card"
            >
              <p className="col-span-full whitespace-pre-wrap text-sm">
                {patient.motivoConsulta}
              </p>
            </FormSection>
          )}

          {antecedentesPositivos.length > 0 && (
            <FormSection title="Antecedentes Personales" icon={History} contentClassName="bg-card">
              <div className="col-span-full flex flex-wrap gap-2">
                {antecedentesPositivos.map((a) => {
                  const detalle = [a.fechaInicio, a.medicacion, a.resolucion]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <span
                      key={a.tipo}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                      title={detalle || undefined}
                    >
                      {ANTECEDENTE_LABELS.get(a.tipo) ?? a.tipo}
                    </span>
                  );
                })}
              </div>
            </FormSection>
          )}

          {tieneDiagnostico && (
            <FormSection title="Diagnóstico" icon={ClipboardCheck} contentClassName="bg-card">
              {Boolean(patient.diagnosticoPresuntivo?.trim()) && (
                <div className="col-span-full flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Diagnóstico Presuntivo
                  </span>
                  <p className="whitespace-pre-wrap text-sm">{patient.diagnosticoPresuntivo}</p>
                </div>
              )}
              {Boolean(patient.metodosComplementarios?.trim()) && (
                <div className="col-span-full flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Métodos Complementarios
                  </span>
                  <p className="whitespace-pre-wrap text-sm">{patient.metodosComplementarios}</p>
                </div>
              )}
              {Boolean(patient.tratamiento?.trim()) && (
                <div className="col-span-full flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Tratamiento</span>
                  <p className="whitespace-pre-wrap text-sm">{patient.tratamiento}</p>
                </div>
              )}
            </FormSection>
          )}
        </div>

        <div>
          <FormSection title="Evolución Clínica" icon={NotebookPen} contentClassName="bg-card">
            <div className="col-span-full">
              <EvolucionManager patientId={patient.id} initialEvoluciones={evolucionValues} />
            </div>
          </FormSection>
        </div>
      </div>
    </div>
  );
}
