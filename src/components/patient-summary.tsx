import Link from "next/link";
import { textoPlano } from "@/lib/evolucion-formato";
import type { ComponentType, ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Apple,
  ClipboardCheck,
  ClipboardSignature,
  FileText,
  History,
  IdCard,
  MessageSquareText,
  NotebookPen,
  Pencil,
  ChevronRight,
  ReceiptText,
  ScrollText,
} from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { TIME_ZONE } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/patient-form/fields";
import {
  ANTECEDENTE_LABELS,
  ETIQUETAS_PSICOLOGIA,
  etiquetasHistoriaClinica,
  alertasClinicas,
  datosEvaluacionNutricional,
  datosGinecoObstetricos,
  esSaludMental,
  ETIQUETAS_NUTRICION,
  ETIQUETAS_GINECOLOGIA,
  ASISTENCIA_LABELS,
  MODALIDAD_LABELS,
  RIESGO_LABELS,
  riesgoDestacado,
  usaSesiones,
  vocabularioEvolucion,
} from "@/components/patient-form/constants";
import {
  edadLegible,
  esMenorDeEdad,
  camposSesionFromApi,
  formatFechaCorta,
} from "@/components/patient-form/utils";
import { DictadoCompleto } from "@/components/patient-form/dictado-completo";
import type { EvolucionValue, PatientFormValues } from "@/components/patient-form/types";
import { EvolucionManager } from "@/components/evolucion-manager";
import { ControlesManager } from "@/components/controles/controles-manager";
import { CAMPO_CONTROL_INFO, CAMPOS_CONTROL, controlFromDb, indicadoresPara } from "@/lib/controles";
import { ConsentimientoManager, type ConsentimientoValue } from "@/components/consentimiento-manager";
import { plantillasConsentimiento } from "@/lib/consentimiento-plantillas";
import type { Especialidad, GrupoEspecialidad } from "@/lib/especialidad";
import { AlertasClinicas } from "@/components/alertas-clinicas";
import { DeletePatientButton } from "@/components/delete-patient-button";
import { PatientTurnoDiffSection } from "@/components/patient-turno-diff-section";
import type { TurnoDiff } from "@/lib/patient-turno-diff";
import { describirDatosOdontograma } from "@/lib/odontograma";
import { AuditHistoryList } from "@/components/audit-history-list";
import {
  OdontogramaResumen,
  type OdontogramaResumenProps,
} from "@/components/odontograma/odontograma-resumen";
import { OdontogramaVisitas } from "@/components/odontograma/odontograma-visitas";
import { Presupuestos, type PresupuestosProps } from "@/components/odontograma/presupuestos";

type PatientWithRelations = Prisma.PatientGetPayload<{
  include: { antecedentes: true; evoluciones: true; controles: true; consentimientos: true };
}>;

type AuditEntry = Prisma.AuditLogGetPayload<{
  include: { actor: { select: { nombre: true; apellido: true } } };
}>;

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
  CREAR_CONTROL: "registró un control",
  MODIFICAR_CONTROL: "modificó un control",
  ELIMINAR_CONTROL: "eliminó un control",
  EXPORTAR_PACIENTE: "generó una copia de la historia clínica",
  CREAR_CONSENTIMIENTO: "registró un consentimiento informado",
  MODIFICAR_CONSENTIMIENTO: "revocó un consentimiento informado",
  ELIMINAR_CONSENTIMIENTO: "eliminó un consentimiento informado",
  RESTAURAR_CONSENTIMIENTO: "restauró un consentimiento informado",
  EXPORTAR_CONSENTIMIENTO: "imprimió el consentimiento informado para su firma",
  CREAR_ODONTOGRAMA: "registró un odontograma",
  MODIFICAR_ODONTOGRAMA: "modificó un odontograma",
  ELIMINAR_ODONTOGRAMA: "eliminó un odontograma",
  CREAR_PRACTICA_ODONTOLOGICA: "registró una práctica odontológica",
  ELIMINAR_PRACTICA_ODONTOLOGICA: "eliminó una práctica odontológica",
  CREAR_PRESUPUESTO: "armó un presupuesto",
  MODIFICAR_PRESUPUESTO: "cambió el estado de un presupuesto",
  ELIMINAR_PRESUPUESTO: "eliminó un presupuesto",
  EXPORTAR_PRESUPUESTO: "imprimió un presupuesto",
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
  antecedentesEnfermedadDictado: "Dictado de antecedentes de la enfermedad actual",
  diagnosticoPresuntivo: "Diagnóstico Presuntivo",
  metodosComplementarios: "Métodos Complementarios",
  tratamiento: "Tratamiento",
  ...ETIQUETAS_PSICOLOGIA,
  ...ETIQUETAS_GINECOLOGIA,
  ...Object.fromEntries(CAMPOS_CONTROL.map((c) => [c, CAMPO_CONTROL_INFO[c].label])),
  fecha: "Fecha",
  contenido: "Contenido",
  contenidoDictado: "Dictado",
  asistencia: "Asistencia",
  modalidad: "Modalidad",
  riesgo: "Riesgo",
  notasPrivadas: "Notas privadas",
  revocadoEn: "Fecha de revocación",
  revocadoMotivo: "Motivo de revocación",
  datos: "Piezas que cambiaron (estado anterior)",
  antecedentes: "Antecedentes que cambiaron (estado anterior)",
  nota: "Nota",
};

function humanizarCampo(campo: string): string {
  if (CAMPO_LABELS[campo]) return CAMPO_LABELS[campo];
  const espaciado = campo.replace(/([A-Z])/g, " $1");
  return espaciado.charAt(0).toUpperCase() + espaciado.slice(1);
}

function formatDetalleValor(entidad: string, campo: string, value: unknown): string {
  if (entidad === "ODONTOGRAMA" && campo === "datos") return describirDatosOdontograma(value);
  if (entidad === "ODONTOGRAMA" && campo === "tipo") {
    if (value === "INICIAL") return "Inicial";
    if (value === "CONTROL") return "Control";
  }
  if (value === null || value === undefined || value === "") return "—";
  if (entidad === "EVOLUCION" && typeof value === "string") {
    const etiqueta =
      (campo === "asistencia" && ASISTENCIA_LABELS.get(value)) ||
      (campo === "modalidad" && MODALIDAD_LABELS.get(value)) ||
      (campo === "riesgo" && RIESGO_LABELS.get(value));
    if (etiqueta) return etiqueta;
    // El historial muestra el texto, no las marcas de formato.
    if (campo === "contenido") return textoPlano(value);
  }
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const fecha = new Date(value);
    if (!Number.isNaN(fecha.getTime())) {
      return fecha.toLocaleDateString("es-AR", { timeZone: "UTC" });
    }
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Un campo de texto libre de la ficha (motivo de consulta, diagnóstico...).
// No pinta nada si está vacío.
function Bloque({
  label,
  value,
  children,
}: {
  label: string;
  value: string | null;
  children?: ReactNode;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="col-span-full flex flex-col gap-1">
      <span className="text-xs font-bold text-foreground">{label}</span>
      <p className="whitespace-pre-wrap text-sm">{value}</p>
      {children}
    </div>
  );
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
  transcripcionHabilitada = false,
  resumirEvolucionesAlTerminar = false,
  evolucionHabilitada = true,
  odontograma = null,
  presupuestos = null,
  grupo = "MEDICA",
  especialidad = null,
}: {
  patient: PatientWithRelations;
  diffs?: TurnoDiff[];
  patientValues?: PatientFormValues;
  auditEntries?: AuditEntry[];
  transcripcionHabilitada?: boolean;
  resumirEvolucionesAlTerminar?: boolean;
  // false para odontólogos (ver esOdontologica()): no usan evolución clínica.
  evolucionHabilitada?: boolean;
  // Solo odontólogos: última visita del odontograma. Cambia la disposición de
  // la ficha (columna lateral de datos clínicos + odontograma; consentimientos
  // y auditoría plegados).
  odontograma?: OdontogramaResumenProps | null;
  // Solo odontólogos: presupuestos del plan de tratamiento.
  presupuestos?: PresupuestosProps | null;
  // Grupo de la especialidad (ver grupoEspecialidad()): otros nombres y
  // campos propios en consulta inicial, antecedentes y diagnóstico.
  grupo?: GrupoEspecialidad;
  // Afina los controles del grupo médico (ver indicadoresPara()).
  especialidad?: Especialidad | null;
}) {
  const saludMental = esSaludMental(grupo);
  const sesiones = usaSesiones(grupo);
  const etiquetas = etiquetasHistoriaClinica(grupo);
  // Antecedentes que cambian la atención (odontología, pediatría), arriba de
  // todo.
  const alertas = alertasClinicas(grupo, patient.antecedentes);
  const hay = (value: string | null) => Boolean(value?.trim());
  const edad = edadLegible(patient.fechaNacimiento?.toISOString() ?? "");
  const antecedentesPositivos = patient.antecedentes.filter((a) => a.respuesta);
  const tieneConsultaInicial = [
    patient.motivoConsulta,
    patient.antecedentesEnfermedad,
    patient.derivadoPor,
    patient.expectativasTratamiento,
    patient.encuadre,
  ].some(hay);
  const tieneHistoriaPersonal = hay(patient.grupoFamiliar) || hay(patient.historiaVital);
  const evaluacionNutricional =
    grupo === "NUTRICION"
      ? datosEvaluacionNutricional(
          patient,
          esMenorDeEdad(patient.fechaNacimiento?.toISOString().slice(0, 10) ?? "")
        )
      : [];
  const tieneEvaluacionNutricional =
    evaluacionNutricional.length > 0 || hay(patient.habitosAlimentarios) || hay(patient.recordatorio24h);
  const ginecoObstetricos = datosGinecoObstetricos(
    patient,
    patient.antecedentes.some((a) => a.tipo === "EMBARAZO" && a.respuesta)
  );
  const tieneDiagnostico = [
    patient.diagnosticoPresuntivo,
    patient.enfoqueTerapeutico,
    patient.metodosComplementarios,
    patient.tratamiento,
  ].some(hay);

  const evolucionValues: EvolucionValue[] = patient.evoluciones.map((e) => ({
    id: e.id,
    fecha: e.fecha.toISOString().slice(0, 10),
    contenido: e.contenido,
    contenidoDictado: e.contenidoDictado,
    ...camposSesionFromApi(e),
  }));

  // Salud mental: el último riesgo registrado manda (si la evolución
  // siguiente lo bajó, deja de alertar). Moderado o alto se avisa arriba de
  // todo.
  const ultimoRiesgo = saludMental
    ? evolucionValues
        .filter((e) => e.riesgo)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .at(-1)
    : undefined;
  const alertaRiesgo = ultimoRiesgo && riesgoDestacado(ultimoRiesgo.riesgo) && (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
        ultimoRiesgo.riesgo === "ALTO"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
      )}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span>
        <strong>{RIESGO_LABELS.get(ultimoRiesgo.riesgo!)}</strong> registrado en {sesiones ? "la sesión" : "la consulta"} del{" "}
        {formatFechaCorta(ultimoRiesgo.fecha)}.
      </span>
    </div>
  );

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

  const consentimientosActivos = patient.consentimientos.filter((c) => !c.deletedAt).length;

  const encabezado = (
    <div className="sticky top-0 z-20 -mx-4 -mt-6 flex flex-col gap-4 bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between print:static">
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
  );

  // Ficha odontológica: la información va en la columna lateral angosta, así
  // que usa 2 columnas fijas en vez de la grilla de 12.
  // Menores de edad: adulto responsable (ver datos-personales-tab.tsx).
  const responsable = patient.responsableNombre?.trim()
    ? `${patient.responsableNombre}${patient.responsableVinculo ? ` (${patient.responsableVinculo})` : ""}`
    : null;

  const informacionCompacta = odontograma && (
    <FormSection title="Información del Paciente" icon={IdCard} contentClassName="bg-card">
      <div className="col-span-full grid grid-cols-2 gap-x-4 gap-y-3">
        <InfoField label="Nombre y Apellido" value={patient.nombreYApellido} className="col-span-2" />
        <InfoField label="Edad" value={edad || null} />
        <InfoField label="DNI" value={patient.nroDocumento} />
        <InfoField label="Teléfono" value={patient.telefono} className="col-span-2" />
        <InfoField label="Obra Social" value={patient.obraSocial} />
        <InfoField label="Nro Obra Social" value={patient.obraSocialNro} />
        {responsable && (
          <>
            <InfoField label="Responsable" value={responsable} className="col-span-2" />
            <InfoField label="Tel. responsable" value={patient.responsableTelefono} className="col-span-2" />
          </>
        )}
      </div>
    </FormSection>
  );

  const informacion = (
    <FormSection title="Información del Paciente" icon={IdCard} contentClassName="bg-card">
      <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-12">
        <InfoField
          label="Nombre y Apellido"
          value={patient.nombreYApellido}
          className="sm:col-span-4"
        />
        <InfoField label="Edad" value={edad || null} className="sm:col-span-2" />
        <InfoField label="DNI" value={patient.nroDocumento} className="sm:col-span-3" />
        <InfoField label="Teléfono" value={patient.telefono} className="sm:col-span-3" />
        <InfoField label="Obra Social" value={patient.obraSocial} className="sm:col-span-6" />
        <InfoField label="Nro Obra Social" value={patient.obraSocialNro} className="sm:col-span-6" />
        {responsable && (
          <>
            <InfoField label="Responsable" value={responsable} className="sm:col-span-6" />
            <InfoField
              label="Tel. responsable"
              value={patient.responsableTelefono}
              className="sm:col-span-6"
            />
          </>
        )}
      </div>
    </FormSection>
  );

  const diferenciasTurno = diffs.length > 0 && patientValues && (
    <PatientTurnoDiffSection patientId={patient.id} patientValues={patientValues} diffs={diffs} />
  );

  const antecedentes = (antecedentesPositivos.length > 0 || tieneHistoriaPersonal || ginecoObstetricos.length > 0) && (
    <FormSection title="Antecedentes Personales" icon={History} contentClassName="bg-card">
      {ginecoObstetricos.length > 0 && (
        <div className="col-span-full grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {ginecoObstetricos.map((d) => (
            <InfoField key={d.label} label={d.label} value={d.value} />
          ))}
        </div>
      )}
      {antecedentesPositivos.length > 0 && (
        <div className="col-span-full flex flex-wrap gap-2">
          {antecedentesPositivos.map((a) => {
            const detalle = [a.fechaInicio, a.descripcion, a.medicacion, a.resolucion]
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
      )}
      <Bloque label={ETIQUETAS_PSICOLOGIA.grupoFamiliar} value={patient.grupoFamiliar} />
      <Bloque label={ETIQUETAS_PSICOLOGIA.historiaVital} value={patient.historiaVital} />
    </FormSection>
  );

  // Nutrición: la evaluación (con el IMC) va en la ficha, a la vista.
  const nutricional = tieneEvaluacionNutricional && (
    <FormSection title="Evaluación nutricional" icon={Apple} contentClassName="bg-card">
      {evaluacionNutricional.length > 0 && (
        <div className="col-span-full grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {evaluacionNutricional.map((d) => (
            <InfoField key={d.label} label={d.label} value={d.value} />
          ))}
        </div>
      )}
      <Bloque label={ETIQUETAS_NUTRICION.habitosAlimentarios} value={patient.habitosAlimentarios} />
      <Bloque label={ETIQUETAS_NUTRICION.recordatorio24h} value={patient.recordatorio24h} />
    </FormSection>
  );

  const diagnostico = tieneDiagnostico && (
    <FormSection title="Diagnóstico" icon={ClipboardCheck} contentClassName="bg-card">
      <Bloque label={etiquetas.diagnosticoPresuntivo} value={patient.diagnosticoPresuntivo} />
      <Bloque label={ETIQUETAS_PSICOLOGIA.enfoqueTerapeutico} value={patient.enfoqueTerapeutico} />
      <Bloque label={etiquetas.tratamiento} value={patient.tratamiento} />
      <Bloque label={etiquetas.metodosComplementarios} value={patient.metodosComplementarios} />
    </FormSection>
  );

  const listaAuditoria = (
    <AuditHistoryList
      items={auditEntries.map((entry) => {
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
                <strong>{actorNombre}</strong> {(entry.entidad === "EVOLUCION"
                  ? AUDIT_LABELS[clave]?.replace("una evolución clínica", vocabularioEvolucion(sesiones).una)
                  : AUDIT_LABELS[clave]) ?? clave.toLowerCase()}.
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
                        {formatDetalleValor(entry.entidad, campo, valor)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </div>
        );
      })}
    />
  );

  const consultaInicial = tieneConsultaInicial && (
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
      <Bloque label={ETIQUETAS_PSICOLOGIA.derivadoPor} value={patient.derivadoPor} />
      <Bloque label={etiquetas.motivoConsulta} value={patient.motivoConsulta} />
      <Bloque label={etiquetas.antecedentesEnfermedad} value={patient.antecedentesEnfermedad}>
        <DictadoCompleto dictado={patient.antecedentesEnfermedadDictado} />
      </Bloque>
      <Bloque
        label={ETIQUETAS_PSICOLOGIA.expectativasTratamiento}
        value={patient.expectativasTratamiento}
      />
      <Bloque label={ETIQUETAS_PSICOLOGIA.encuadre} value={patient.encuadre} />
    </FormSection>
  );

  const consentimientos = (
    <ConsentimientoManager
      patientId={patient.id}
      initialConsentimientos={consentimientoValues}
      plantillas={plantillasConsentimiento(grupo)}
    />
  );

  if (odontograma) {
    const ultimaAuditoria = auditEntries[0];
    const cantidadAuditoria = `${auditEntries.length}${auditEntries.length === 50 ? "+" : ""} evento${
      auditEntries.length === 1 ? "" : "s"
    }`;
    return (
      <div className="flex flex-col gap-6">
        {encabezado}

        <AlertasClinicas alertas={alertas} />

        {diferenciasTurno}

        {/* Columna lateral (25%) con los datos clínicos y el odontograma (75%).
            Debajo de xl se apilan y las tarjetas laterales pasan a una grilla. */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] xl:items-start">
          <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 md:items-start xl:flex xl:flex-col xl:items-stretch">
            {informacionCompacta}
            {consultaInicial}
            {antecedentes}
            {diagnostico}
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <OdontogramaResumen {...odontograma} />
            <OdontogramaVisitas patientId={odontograma.patientId} visitas={odontograma.historial} />
            {presupuestos && (
              <FormSection title="Presupuestos" icon={ReceiptText} contentClassName="bg-card">
                <div className="col-span-full">
                  <Presupuestos {...presupuestos} />
                </div>
              </FormSection>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
          <SeccionPlegable
            icon={ClipboardSignature}
            titulo="Consentimientos informados"
            resumen={
              consentimientosActivos === 0
                ? "Ninguno registrado"
                : `${consentimientosActivos} registrado${consentimientosActivos === 1 ? "" : "s"}`
            }
          >
            {consentimientos}
          </SeccionPlegable>
          {ultimaAuditoria && (
            <SeccionPlegable
              icon={ScrollText}
              titulo="Historial de auditoría"
              resumen={`${cantidadAuditoria} · último ${formatAuditFecha(ultimaAuditoria.createdAt)}`}
            >
              {listaAuditoria}
            </SeccionPlegable>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {encabezado}

      <AlertasClinicas alertas={alertas} />

      {alertaRiesgo}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="contents lg:sticky lg:top-20 lg:-m-1 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col lg:gap-6 lg:self-start lg:overflow-y-auto lg:p-1 lg:*:shrink-0 subtle-scrollbar">
          {informacion}
          {diferenciasTurno}
          {antecedentes}
          {nutricional}
          {diagnostico}

          {auditEntries.length > 0 && (
            <div className="order-last lg:order-none">
              <FormSection title="Historial de auditoría" icon={ScrollText} contentClassName="bg-card">
                {listaAuditoria}
              </FormSection>
            </div>
          )}
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-6">
          {consultaInicial}

          {indicadoresPara(grupo, especialidad).length > 0 && (
            <FormSection title="Controles" icon={Activity} contentClassName="bg-card">
              <div className="col-span-full">
                <ControlesManager
                  patientId={patient.id}
                  grupo={grupo}
                  especialidad={especialidad}
                  initialControles={patient.controles.map(controlFromDb)}
                  fechaNacimiento={patient.fechaNacimiento?.toISOString().slice(0, 10) ?? null}
                  fum={patient.fum}
                  estatura={patient.estatura}
                />
              </div>
            </FormSection>
          )}

          {evolucionHabilitada && (
            <FormSection
              title={vocabularioEvolucion(sesiones).titulo}
              icon={NotebookPen}
              contentClassName="bg-card"
            >
              <div className="col-span-full">
                <EvolucionManager
                  patientId={patient.id}
                  initialEvoluciones={evolucionValues}
                  transcripcionHabilitada={transcripcionHabilitada}
                  resumirAlTerminar={resumirEvolucionesAlTerminar}
                  sesiones={sesiones}
                  saludMental={saludMental}
                />
              </div>
            </FormSection>
          )}

          <FormSection
            title="Consentimientos Informados"
            icon={ClipboardSignature}
            contentClassName="bg-card"
          >
            <div className="col-span-full">{consentimientos}</div>
          </FormSection>
        </div>
      </div>
    </div>
  );
}

// Bloque secundario de la ficha odontológica: una línea con el resumen que se
// despliega para ver y usar el contenido completo.
function SeccionPlegable({
  icon: Icon,
  titulo,
  resumen,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  titulo: string;
  resumen: string;
  children: ReactNode;
}) {
  return (
    <details className="group overflow-hidden rounded-xl border border-border/60 bg-card">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2.5 gap-y-0.5 px-4 py-3 text-sm outline-none select-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5 [&::-webkit-details-marker]:hidden">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-semibold">{titulo}</span>
        <span className="min-w-0 text-muted-foreground">{resumen}</span>
        <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-border/60 p-4 sm:p-5">{children}</div>
    </details>
  );
}
