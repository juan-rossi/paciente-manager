import Link from "next/link";
import {
  ClipboardCheck,
  ClipboardSignature,
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
import { TIME_ZONE } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/patient-form/fields";
import { ANTECEDENTES_ORDEN } from "@/components/patient-form/constants";
import { calcularEdad } from "@/components/patient-form/utils";
import type { EvolucionValue, PatientFormValues } from "@/components/patient-form/types";
import { EvolucionManager } from "@/components/evolucion-manager";
import { ConsentimientoManager, type ConsentimientoValue } from "@/components/consentimiento-manager";
import { DeletePatientButton } from "@/components/delete-patient-button";
import { PatientTurnoDiffSection } from "@/components/patient-turno-diff-section";
import type { TurnoDiff } from "@/lib/patient-turno-diff";

type PatientWithRelations = Prisma.PatientGetPayload<{
  include: { antecedentes: true; evoluciones: true; consentimientos: true };
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
  CREAR_CONSENTIMIENTO: "registró un consentimiento informado",
  MODIFICAR_CONSENTIMIENTO: "revocó un consentimiento informado",
  ELIMINAR_CONSENTIMIENTO: "eliminó un consentimiento informado",
  RESTAURAR_CONSENTIMIENTO: "restauró un consentimiento informado",
  EXPORTAR_CONSENTIMIENTO: "imprimió el consentimiento informado para su firma",
};

// Los timestamps de auditoría son instantes reales (no fechas de calendario
// puras) -- hay que fijar el huso horario explícitamente, porque en
// producción (Vercel) el proceso corre en UTC, no en horario de Argentina.
function formatAuditFecha(fecha: Date): string {
  const dia = fecha.toLocaleDateString("es-AR", { timeZone: TIME_ZONE });
  const hora = fecha.toLocaleTimeString("es-AR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dia}, ${hora} hs`;
}

// Etiquetas para los campos que más comúnmente aparecen en `detalleAnterior`
// (ver src/lib/audit-log.ts). Para cualquier otro campo, se humaniza el
// nombre camelCase como fallback razonable en vez de mantener acá un mapa
// de los ~70 campos posibles del paciente.
const CAMPO_LABELS: Record<string, string> = {
  nombreYApellido: "Nombre y Apellido",
  fechaNacimiento: "Fecha de nacimiento",
  nroDocumento: "DNI",
  domicilio: "Domicilio",
  telefono: "Teléfono",
  obraSocial: "Obra Social",
  obraSocialNro: "Nro Obra Social",
  motivoConsulta: "Motivo de Consulta",
  antecedentesEnfermedad: "Antecedentes de la enfermedad actual",
  diagnosticoPresuntivo: "Diagnóstico Presuntivo",
  metodosComplementarios: "Métodos Complementarios",
  tratamiento: "Tratamiento",
  fecha: "Fecha",
  contenido: "Contenido",
  revocadoEn: "Fecha de revocación",
  revocadoMotivo: "Motivo de revocación",
};

function humanizarCampo(campo: string): string {
  if (CAMPO_LABELS[campo]) return CAMPO_LABELS[campo];
  const espaciado = campo.replace(/([A-Z])/g, " $1");
  return espaciado.charAt(0).toUpperCase() + espaciado.slice(1);
}

function formatDetalleValor(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const fecha = new Date(value);
    if (!Number.isNaN(fecha.getTime())) {
      return fecha.toLocaleDateString("es-AR", { timeZone: "UTC" });
    }
  }
  return String(value);
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

  const consentimientoValues: ConsentimientoValue[] = patient.consentimientos.map((c) => ({
    id: c.id,
    procedimiento: c.procedimiento,
    riesgosBeneficios: c.riesgosBeneficios,
    alternativas: c.alternativas,
    tipo: c.tipo,
    estado: c.estado,
    fecha: c.fecha.toISOString().slice(0, 10),
    revocadoEn: c.revocadoEn ? c.revocadoEn.toISOString() : null,
    revocadoMotivo: c.revocadoMotivo,
    deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{patient.nombreYApellido}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DeletePatientButton patientId={patient.id} patientName={patient.nombreYApellido} />
          <Button
            variant="outline"
            nativeButton={false}
            className="hidden sm:inline-flex"
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
        <div className="contents lg:flex lg:flex-col lg:gap-6">
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
            <div className="order-last lg:order-none">
              <FormSection title="Historial de auditoría" icon={ScrollText} contentClassName="bg-card">
              <div className="col-span-full flex flex-col divide-y divide-border">
                {auditEntries.map((entry) => {
                  const clave = `${entry.accion}_${entry.entidad}`;
                  const actorNombre = `${entry.actor.nombre} ${entry.actor.apellido}`.trim();
                  const detalle = entry.detalleAnterior as Record<string, unknown> | null;
                  return (
                    <div key={entry.id} className="flex flex-col gap-1 py-2 text-sm first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-xs text-muted-foreground">
                          {formatAuditFecha(entry.createdAt)}
                        </span>
                        <span>
                          <strong>{actorNombre}</strong> {AUDIT_LABELS[clave] ?? clave.toLowerCase()}.
                        </span>
                      </div>
                      {detalle && Object.keys(detalle).length > 0 && (
                        <details className="ml-1">
                          <summary className="cursor-pointer text-xs text-primary select-none">
                            Ver versión anterior
                          </summary>
                          <dl className="mt-1 flex flex-col gap-1.5 rounded-md bg-muted/40 p-2">
                            {Object.entries(detalle).map(([campo, valor]) => (
                              <div key={campo} className="flex flex-col gap-0.5">
                                <dt className="text-xs font-semibold text-muted-foreground">
                                  {humanizarCampo(campo)}
                                </dt>
                                <dd className="whitespace-pre-wrap text-xs">
                                  {formatDetalleValor(valor)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
              </FormSection>
            </div>
          )}
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-6">
          {tieneConsultaInicial && (
            <FormSection
              title="Consulta Inicial"
              icon={MessageSquareText}
              contentClassName="bg-card"
              headerExtra={
                <span className="text-xs font-normal text-muted-foreground">
                  Creado el {patient.createdAt.toLocaleDateString("es-AR", { timeZone: TIME_ZONE })}
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

          <FormSection
            title="Consentimientos Informados"
            icon={ClipboardSignature}
            contentClassName="bg-card"
          >
            <div className="col-span-full">
              <ConsentimientoManager
                patientId={patient.id}
                initialConsentimientos={consentimientoValues}
              />
            </div>
          </FormSection>
        </div>
      </div>
    </div>
  );
}
