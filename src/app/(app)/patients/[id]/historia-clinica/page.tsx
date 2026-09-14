import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { registrarAuditoria } from "@/lib/audit-log";
import { calcularEdad } from "@/components/patient-form/utils";
import { ANTECEDENTES_ORDEN, ESTADO_CIVIL_OPTIONS } from "@/components/patient-form/constants";
import { PrintButton } from "@/components/print-button";
import { Card, CardContent } from "@/components/ui/card";

type Props = { params: Promise<{ id: string }> };

const SEXO_LABELS: Record<string, string> = { MASCULINO: "Masculino", FEMENINO: "Femenino" };
const ESTADO_CIVIL_LABELS = new Map(ESTADO_CIVIL_OPTIONS.map((o) => [o.value, o.label]));
const ANTECEDENTE_LABELS = new Map(ANTECEDENTES_ORDEN.map((a) => [a.tipo, a.label]));

// `fechaNacimiento`/`evolucion.fecha` se guardan como medianoche UTC
// representando un día calendario, no un instante real -- formatearlas en
// el huso horario local (Argentina, UTC-3) corre el día para atrás. Ver el
// mismo criterio en `parseFechaISO` de patient-form/utils.ts.
function formatFecha(fecha: Date | null): string {
  if (!fecha) return "—";
  return fecha.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

type FieldEntry = { label: string; value: string | null | undefined };

function Datos({ fields }: { fields: FieldEntry[] }) {
  const populated = fields.filter((f) => f.value && f.value.trim());
  if (populated.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      {populated.map((f) => (
        <div key={f.label} className="flex flex-col gap-0.5">
          <dt className="text-xs font-semibold text-muted-foreground">{f.label}</dt>
          <dd className="whitespace-pre-wrap">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Seccion({
  titulo,
  fields,
  children,
}: {
  titulo: string;
  fields?: FieldEntry[];
  children?: React.ReactNode;
}) {
  const tieneCampos = fields ? fields.some((f) => f.value && f.value.trim()) : true;
  if (!tieneCampos && !children) return null;
  return (
    <section className="break-inside-avoid border-b border-border pb-4">
      <h2 className="mb-2 text-xs font-bold tracking-wide text-foreground uppercase">{titulo}</h2>
      {fields && <Datos fields={fields} />}
      {children}
    </section>
  );
}

export default async function HistoriaClinicaPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const tenantId = getTenantId(user);

  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, doctorId: tenantId, deletedAt: null },
    include: {
      antecedentes: { where: { respuesta: true } },
      evoluciones: { where: { deletedAt: null }, orderBy: { fecha: "asc" } },
      consentimientos: { where: { deletedAt: null }, orderBy: { fecha: "asc" } },
    },
  });

  if (!patient) notFound();

  const doctor = await prisma.user.findUnique({
    where: { id: tenantId },
    select: { nombre: true, apellido: true, nroMatricula: true },
  });

  // Ley 26.529 art. 14: deja registro de que se generó una copia de la
  // historia clínica (entregable al paciente dentro de las 48hs -- acá el
  // trámite es instantáneo, así que el plazo queda cumplido de por sí).
  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "EXPORTAR",
    entidad: "PACIENTE",
    entidadId: patient.id,
  });

  const edad = calcularEdad(patient.fechaNacimiento?.toISOString().slice(0, 10) ?? "");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-muted-foreground">
          Copia de la historia clínica para entregar al paciente (Ley 26.529, art. 14).
        </p>
        <PrintButton />
      </div>

      <Card className="print:rounded-none print:border-none print:bg-transparent print:py-0 print:shadow-none">
        <CardContent className="flex flex-col gap-6 print:px-0">
          <header className="flex flex-col gap-1 border-b-2 border-foreground pb-4">
            <h1 className="text-xl font-bold">Historia Clínica</h1>
            <p className="text-sm text-muted-foreground">
              {doctor ? `${doctor.nombre} ${doctor.apellido}`.trim() : ""}
              {doctor?.nroMatricula ? ` — Matrícula ${doctor.nroMatricula}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Copia generada el {new Date().toLocaleDateString("es-AR")}
            </p>
          </header>

          <Seccion
        titulo="Datos del paciente"
        fields={[
          { label: "Nombre y Apellido", value: patient.nombreYApellido },
          { label: "DNI", value: patient.nroDocumento },
          {
            label: "Fecha de nacimiento",
            value: patient.fechaNacimiento
              ? `${formatFecha(patient.fechaNacimiento)}${edad ? ` (${edad} años)` : ""}`
              : null,
          },
          { label: "Sexo", value: patient.sexo ? SEXO_LABELS[patient.sexo] : null },
          {
            label: "Estado civil",
            value: patient.estadoCivil ? ESTADO_CIVIL_LABELS.get(patient.estadoCivil) : null,
          },
          { label: "Profesión", value: patient.profesion },
          { label: "Nacionalidad", value: patient.nacionalidad },
          { label: "Domicilio", value: patient.domicilio },
          { label: "Teléfono", value: patient.telefono },
          { label: "Obra Social", value: patient.obraSocial },
          { label: "Nro Obra Social", value: patient.obraSocialNro },
          { label: "Contacto de emergencia", value: patient.contactoEmergencia },
          { label: "Teléfono de emergencia", value: patient.telefonoEmergencia },
        ]}
      />

      <Seccion
        titulo="Consulta inicial"
        fields={[
          { label: "AUTOVALIDO Total", value: patient.autoValidoTotal },
          { label: "Parcial", value: patient.autoValidoParcial },
          { label: "Dependiente", value: patient.dependiente },
          { label: "Motivo de Consulta", value: patient.motivoConsulta },
          { label: "Antecedentes de la enfermedad actual", value: patient.antecedentesEnfermedad },
          {
            label: "Hábitos tóxicos",
            value: [
              patient.habitoAlcohol && "Alcohol",
              patient.habitoCigarrillos && "Cigarrillos",
              patient.habitoDrogas && "Drogas",
            ]
              .filter(Boolean)
              .join(", ") || null,
          },
        ]}
      />

      {patient.antecedentes.length > 0 && (
        <Seccion titulo="Antecedentes personales">
          <ul className="flex flex-col gap-2 text-sm">
            {patient.antecedentes.map((a) => (
              <li key={a.id}>
                <strong>{ANTECEDENTE_LABELS.get(a.tipo) ?? a.tipo}</strong>
                {[a.fechaInicio, a.medicacion, a.resolucion].filter(Boolean).length > 0 && (
                  <span className="text-muted-foreground">
                    {" — "}
                    {[a.fechaInicio, a.medicacion, a.resolucion].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion
        titulo="Signos vitales"
        fields={[
          { label: "Frecuencia Cardíaca", value: patient.frecuenciaCardiaca },
          { label: "Pulso Radial", value: patient.pulsoRadial },
          { label: "Ritmo", value: patient.ritmo },
          { label: "Presión Arterial", value: patient.presionArterial },
          { label: "Frecuencia Respiratoria", value: patient.frecuenciaRespiratoria },
          { label: "Peso Actual", value: patient.pesoActual },
          { label: "Peso Habitual", value: patient.pesoHabitual },
          { label: "Estatura", value: patient.estatura },
          { label: "Temperatura", value: patient.temperatura },
        ]}
      />

      <Seccion
        titulo="Examen físico"
        fields={[
          { label: "Cráneo", value: patient.craneo },
          { label: "Ojo: Agudeza Visual", value: patient.ojo },
          { label: "Oído: Agudeza Auditiva", value: patient.oido },
          { label: "Piel, Faneras, Celular Subcutáneo y Ganglios", value: patient.pcfg },
          { label: "Cuello — Palpación", value: patient.cuelloPalpacion },
          { label: "Cuello — Tamaño", value: patient.cuelloTamanio },
          { label: "Cuello — Auscultación", value: patient.cuelloAuscultacion },
          { label: "Tórax — Forma", value: patient.toraxForma },
          { label: "Tórax — Mamas", value: patient.toraxMamas },
          { label: "Auscultación M V", value: patient.auscultacionMV },
          { label: "Auscultación V V", value: patient.auscultacionVV },
          { label: "Rales", value: patient.rales },
          { label: "Excursión de Bases y Vértices", value: patient.excursion },
          { label: "R1", value: patient.acvR1 },
          { label: "R2", value: patient.acvR2 },
          { label: "Soplos", value: patient.soplos },
          { label: "Pulso Carotídeo", value: patient.carotideo },
          { label: "Pulso Radial (CV)", value: patient.radial },
          { label: "Pulso Femoral", value: patient.femoral },
          { label: "Pedio", value: patient.pedio },
          { label: "Abdomen — Inspección", value: patient.abdomenInspeccion },
          { label: "Abdomen — Palpación", value: patient.abdomenPalpacion },
          { label: "Abdomen — Auscultación", value: patient.abdomenAuscultacion },
          { label: "PP Renal Derecha", value: patient.ppRenalDerecha },
          { label: "PP Renal Izquierda", value: patient.ppRenalIzquierda },
          { label: "Mamas", value: patient.mamas },
          { label: "Sensorio", value: patient.sensorio },
          { label: "Lenguaje", value: patient.lenguaje },
          { label: "Marcha", value: patient.marcha },
          { label: "Temblor", value: patient.temblor },
          { label: "Taxia", value: patient.taxia },
          { label: "Reflejo Fotomotor", value: patient.reflejosFotomotor },
          { label: "Reflejos de Acomodación", value: patient.reflejosAcomodacion },
          { label: "Reflejos Osteotendinosos", value: patient.osteotendinosos },
          { label: "Sensibilidad", value: patient.sensibilidad },
          { label: "Columna Cervical", value: patient.columnaCervical },
          { label: "Dorsal", value: patient.dorsal },
          { label: "Lumbar", value: patient.lumbar },
          { label: "Articulaciones: Movilidad", value: patient.movilidad },
          { label: "Dolor", value: patient.dolor },
          { label: "Tumefacción", value: patient.tumefaccion },
        ]}
      />

      <Seccion
        titulo="Diagnóstico"
        fields={[
          { label: "Diagnóstico Presuntivo", value: patient.diagnosticoPresuntivo },
          { label: "Métodos Complementarios", value: patient.metodosComplementarios },
          { label: "Tratamiento", value: patient.tratamiento },
        ]}
      />

      {patient.evoluciones.length > 0 && (
        <Seccion titulo="Evolución clínica">
          <div className="flex flex-col gap-3 text-sm">
            {patient.evoluciones.map((e) => (
              <div key={e.id} className="break-inside-avoid">
                <p className="text-xs font-semibold text-muted-foreground">{formatFecha(e.fecha)}</p>
                <p className="whitespace-pre-wrap">{e.contenido}</p>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {patient.consentimientos.length > 0 && (
        <Seccion titulo="Consentimientos informados">
          <div className="flex flex-col gap-3 text-sm">
            {patient.consentimientos.map((c) => (
              <div key={c.id} className="break-inside-avoid">
                <p className="text-xs font-semibold text-muted-foreground">
                  {formatFecha(c.fecha)} — {c.tipo === "ESCRITO" ? "Escrito" : "Verbal"} —{" "}
                  {c.estado === "OTORGADO" ? "Otorgado" : "Rechazado"}
                  {c.revocadoEn && ` — Revocado el ${formatFecha(c.revocadoEn)}`}
                </p>
                <p className="font-semibold">{c.procedimiento}</p>
                <p className="whitespace-pre-wrap">{c.riesgosBeneficios}</p>
              </div>
            ))}
          </div>
        </Seccion>
      )}

          <p className="text-center text-xs text-muted-foreground">
            Documento generado por Semio360 conforme a la Ley 26.529 de Derechos del Paciente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
