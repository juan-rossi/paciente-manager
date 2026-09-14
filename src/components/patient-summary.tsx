import Link from "next/link";
import {
  ClipboardCheck,
  FileText,
  History,
  IdCard,
  MessageSquareText,
  NotebookPen,
  Pencil,
  ScrollText,
} from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/patient-form/fields";
import { ANTECEDENTES_ORDEN } from "@/components/patient-form/constants";
import { calcularEdad } from "@/components/patient-form/utils";
import type { EvolucionValue, PatientFormValues } from "@/components/patient-form/types";
import { EvolucionManager } from "@/components/evolucion-manager";
import { DeletePatientButton } from "@/components/delete-patient-button";
import { PatientTurnoDiffSection } from "@/components/patient-turno-diff-section";
import type { TurnoDiff } from "@/lib/patient-turno-diff";

type PatientWithRelations = Prisma.PatientGetPayload<{
  include: { antecedentes: true; evoluciones: true };
}>;

type AuditEntry = Prisma.AuditLogGetPayload<{
  include: { actor: { select: { nombre: true; apellido: true } } };
}>;

const ANTECEDENTE_LABELS = new Map(ANTECEDENTES_ORDEN.map((a) => [a.tipo, a.label]));

// Ley 26.529 art. 13: texto legible para cada entrada del historial de
// auditoría (quién hizo qué). Ver prisma/schema.prisma (modelo AuditLog).
const AUDIT_LABELS: Record<string, string> = {
  CREAR_PACIENTE: "creó la ficha del paciente",
  MODIFICAR_PACIENTE: "modificó los datos del paciente",
  ELIMINAR_PACIENTE: "eliminó al paciente",
  RESTAURAR_PACIENTE: "restauró al paciente",
  CREAR_EVOLUCION: "agregó una evolución clínica",
  MODIFICAR_EVOLUCION: "modificó una evolución clínica",
  ELIMINAR_EVOLUCION: "eliminó una evolución clínica",
  RESTAURAR_EVOLUCION: "restauró una evolución clínica",
  EXPORTAR_PACIENTE: "generó una copia de la historia clínica",
};

function formatAuditFecha(fecha: Date): string {
  return fecha.toLocaleString("es-AR", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
      <span className="text-xs font-bold text-foreground">{label}</span>
      <span className="text-sm">{value && value.trim() ? value : "—"}</span>
    </div>
  );
}

export function PatientSummary({
  patient,
  diffs = [],
  patientValues,
  auditEntries = [],
}: {
  patient: PatientWithRelations;
  diffs?: TurnoDiff[];
  patientValues?: PatientFormValues;
  auditEntries?: AuditEntry[];
}) {
  const edad = calcularEdad(patient.fechaNacimiento?.toISOString() ?? "");
  const antecedentesPositivos = patient.antecedentes.filter((a) => a.respuesta);
  const tieneConsultaInicial =
    Boolean(patient.motivoConsulta?.trim()) || Boolean(patient.antecedentesEnfermedad?.trim());
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
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/patients/${patient.id}/historia-clinica`} target="_blank" />}
          >
            <FileText className="size-4" />
            Copia para el paciente
          </Button>
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
              <InfoField label="DNI" value={patient.nroDocumento} className="sm:col-span-3" />
              <InfoField label="Teléfono" value={patient.telefono} className="sm:col-span-3" />
              <InfoField label="Obra Social" value={patient.obraSocial} className="sm:col-span-6" />
              <InfoField
                label="Nro Obra Social"
                value={patient.obraSocialNro}
                className="sm:col-span-6"
              />
            </div>
          </FormSection>

          {diffs.length > 0 && patientValues && (
            <PatientTurnoDiffSection
              patientId={patient.id}
              patientValues={patientValues}
              diffs={diffs}
            />
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
                  <span className="text-xs font-bold text-foreground">
                    Diagnóstico Presuntivo
                  </span>
                  <p className="whitespace-pre-wrap text-sm">{patient.diagnosticoPresuntivo}</p>
                </div>
              )}
              {Boolean(patient.metodosComplementarios?.trim()) && (
                <div className="col-span-full flex flex-col gap-1">
                  <span className="text-xs font-bold text-foreground">
                    Métodos Complementarios
                  </span>
                  <p className="whitespace-pre-wrap text-sm">{patient.metodosComplementarios}</p>
                </div>
              )}
              {Boolean(patient.tratamiento?.trim()) && (
                <div className="col-span-full flex flex-col gap-1">
                  <span className="text-xs font-bold text-foreground">Tratamiento</span>
                  <p className="whitespace-pre-wrap text-sm">{patient.tratamiento}</p>
                </div>
              )}
            </FormSection>
          )}

          {auditEntries.length > 0 && (
            <FormSection title="Historial de auditoría" icon={ScrollText} contentClassName="bg-card">
              <div className="col-span-full flex flex-col gap-2">
                {auditEntries.map((entry) => {
                  const clave = `${entry.accion}_${entry.entidad}`;
                  const actorNombre = `${entry.actor.nombre} ${entry.actor.apellido}`.trim();
                  return (
                    <div key={entry.id} className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {formatAuditFecha(entry.createdAt)}
                      </span>
                      <span>
                        <strong>{actorNombre}</strong> {AUDIT_LABELS[clave] ?? clave.toLowerCase()}.
                      </span>
                    </div>
                  );
                })}
              </div>
            </FormSection>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {tieneConsultaInicial && (
            <FormSection
              title="Consulta Inicial"
              icon={MessageSquareText}
              contentClassName="bg-card"
              headerExtra={
                <span className="text-xs font-normal text-muted-foreground">
                  Creado el {patient.createdAt.toLocaleDateString("es-AR")}
                </span>
              }
            >
              {Boolean(patient.motivoConsulta?.trim()) && (
                <div className="col-span-full flex flex-col gap-1">
                  <span className="text-xs font-bold text-foreground">
                    Motivo de Consulta
                  </span>
                  <p className="whitespace-pre-wrap text-sm">{patient.motivoConsulta}</p>
                </div>
              )}
              {Boolean(patient.antecedentesEnfermedad?.trim()) && (
                <div className="col-span-full flex flex-col gap-1">
                  <span className="text-xs font-bold text-foreground">
                    Antecedentes de la enfermedad actual
                  </span>
                  <p className="whitespace-pre-wrap text-sm">{patient.antecedentesEnfermedad}</p>
                </div>
              )}
            </FormSection>
          )}

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
