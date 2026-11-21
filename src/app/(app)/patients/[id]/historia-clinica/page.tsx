import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { registrarAuditoria } from "@/lib/audit-log";
import { edadLegible, esMenorDeEdad } from "@/components/patient-form/utils";
import { formatIndicador, indicadoresPara, unidadIndicador } from "@/lib/controles";
import { datosExamen, EXAMENES_ESPECIALIDAD } from "@/components/patient-form/examenes-especialidad";
import { DictadoCompleto } from "@/components/patient-form/dictado-completo";
import {
  ANTECEDENTE_LABELS,
  ESTADO_CIVIL_OPTIONS,
  ETIQUETAS_PSICOLOGIA,
  datosEvaluacionNutricional,
  datosGinecoObstetricos,
  esSaludMental,
  ETIQUETAS_NUTRICION,
  EXAMEN_PSIQUICO,
  etiquetasHistoriaClinica,
  usaSesiones,
  vocabularioEvolucion,
  ASISTENCIA_LABELS,
  MODALIDAD_LABELS,
  numerarSesiones,
} from "@/components/patient-form/constants";
import { grupoEspecialidad } from "@/lib/especialidad";
import { TIME_ZONE } from "@/lib/timezone";
import { practicaVisitaFromDb } from "@/lib/practica-odontologica";
import { PrintButton } from "@/components/print-button";
import { Card, CardContent } from "@/components/ui/card";
import { PageEnter } from "@/components/page-transition";
import { TextoConFormato } from "@/components/patient-form/texto-con-formato";

type Props = { params: Promise<{ id: string }> };

const SEXO_LABELS: Record<string, string> = { MASCULINO: "Masculino", FEMENINO: "Femenino" };
const ESTADO_CIVIL_LABELS = new Map(ESTADO_CIVIL_OPTIONS.map((o) => [o.value, o.label]));

// `fechaNacimiento`/`evolucion.fecha` se guardan como medianoche UTC
// representando un día calendario, no un instante real -- formatearlas en
// el huso horario local (Argentina, UTC-3) corre el día para atrás. Ver el
// mismo criterio en `parseFechaISO` de patient-form/utils.ts.
function formatFecha(fecha: Date | null): string {
  if (!fecha) return "—";
  return fecha.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

type FieldEntry = { label: string; value: string | null | undefined };

// Un texto largo (relato de antecedentes, tratamiento...) encajonado en una
// columna de 1/3 se vuelve una tira angosta de decenas de renglones. Esos
// campos van debajo de la grilla, a todo el ancho.
const LARGO_TEXTO_ANCHO = 80;

function esTextoLargo(value: string): boolean {
  return value.length > LARGO_TEXTO_ANCHO || value.includes("\n");
}

function Datos({ fields }: { fields: FieldEntry[] }) {
  const populated = fields.filter((f): f is { label: string; value: string } =>
    Boolean(f.value && f.value.trim()),
  );
  if (populated.length === 0) return null;
  const cortos = populated.filter((f) => !esTextoLargo(f.value));
  const largos = populated.filter((f) => esTextoLargo(f.value));
  return (
    <div className="flex flex-col gap-3">
      {cortos.length > 0 && (
        <dl className="grid break-inside-avoid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          {cortos.map((f) => (
            <div key={f.label} className="flex flex-col gap-0.5">
              <dt className="text-xs font-semibold text-muted-foreground">{f.label}</dt>
              <dd className="whitespace-pre-wrap">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {largos.length > 0 && (
        <dl className="flex flex-col gap-3 text-sm">
          {largos.map((f) => (
            <div key={f.label} className="flex flex-col gap-0.5">
              <dt className="text-xs font-semibold text-muted-foreground">{f.label}</dt>
              <dd className="whitespace-pre-wrap leading-relaxed text-pretty">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
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
    <section className="border-b border-border pb-4">
      <h2 className="mb-2 break-after-avoid text-xs font-bold tracking-wide text-foreground uppercase">
        {titulo}
      </h2>
      {fields && <Datos fields={fields} />}
      {children}
    </section>
  );
}

export default async function HistoriaClinicaPage({ params }: Props) {
  const user = await getCurrentUser();
  // La historia clínica es solo del médico: un asistente nunca la ve (el
  // proxy ya la saca de /patients, esto es la segunda barrera).
  if (!user || user.role !== "DOCTOR") notFound();
  const tenantId = getTenantId(user);

  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, doctorId: tenantId, deletedAt: null },
    include: {
      antecedentes: { where: { respuesta: true } },
      evoluciones: { where: { deletedAt: null }, orderBy: { fecha: "asc" } },
      controles: { where: { deletedAt: null }, orderBy: { fecha: "asc" } },
      consentimientos: { where: { deletedAt: null }, orderBy: { fecha: "asc" } },
    },
  });

  if (!patient) notFound();

  // Visitas del odontograma (solo existen para odontólogos). Mismo orden que
  // la ficha: el inicial primero, después por fecha.
  const visitasOdontograma = (
    await prisma.patientOdontograma.findMany({
      where: { patientId: patient.id, deletedAt: null },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      include: { practicas: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } },
    })
  ).sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === "INICIAL" ? -1 : 1));

  const doctor = await prisma.user.findUnique({
    where: { id: tenantId },
    select: { nombre: true, apellido: true, nroMatricula: true, especialidad: true },
  });
  const grupo = grupoEspecialidad(doctor?.especialidad);
  // Salud mental y pediatría hablan de consumo, no de "hábitos tóxicos".
  const consumo = esSaludMental(grupo) || grupo === "PEDIATRICA";
  const sesiones = usaSesiones(grupo);
  const etiquetas = etiquetasHistoriaClinica(grupo);
  // Los controles cargados con otra especialidad (si el médico cambió) se
  // muestran igual: se suman los indicadores que tengan algún valor.
  const indicadoresControl = [
    ...indicadoresPara(grupo),
    ...indicadoresPara("MEDICA"),
    ...indicadoresPara("PEDIATRICA"),
    ...indicadoresPara("GINECOLOGICA"),
    ...indicadoresPara("PSIQUIATRICA"),
    ...indicadoresPara("NUTRICION"),
  ]
    .filter((i, idx, todos) => todos.findIndex((o) => o.id === i.id) === idx)
    .filter((i) => patient.controles.some((c) => i.campos.some((campo) => c[campo] != null)));

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

  const edad = edadLegible(patient.fechaNacimiento?.toISOString().slice(0, 10) ?? "");

  // Psicología y fonoaudiología: número de cada sesión (ver numerarSesiones()).
  const numerosSesion = new Map<(typeof patient.evoluciones)[number], number>();
  if (sesiones) {
    const sesiones = patient.evoluciones.map((e) => ({
      e,
      fecha: e.fecha.toISOString(),
      asistencia: e.asistencia,
    }));
    for (const [s, n] of numerarSesiones(sesiones)) numerosSesion.set(s.e, n);
  }

  return (
    <PageEnter>
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
                Copia generada el{" "}
                {new Date().toLocaleDateString("es-AR", { timeZone: TIME_ZONE })}
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
                ? `${formatFecha(patient.fechaNacimiento)}${edad ? ` (${edad})` : ""}`
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
            { label: "Responsable", value: patient.responsableNombre },
            { label: "Vínculo del responsable", value: patient.responsableVinculo },
            { label: "DNI del responsable", value: patient.responsableDni },
            { label: "Teléfono del responsable", value: patient.responsableTelefono },
          ]}
        />

        <Seccion
          titulo="Consulta inicial"
          fields={[
            { label: "AUTOVALIDO Total", value: patient.autoValidoTotal },
            { label: "Parcial", value: patient.autoValidoParcial },
            { label: "Dependiente", value: patient.dependiente },
            { label: ETIQUETAS_PSICOLOGIA.derivadoPor, value: patient.derivadoPor },
            { label: etiquetas.motivoConsulta, value: patient.motivoConsulta },
            { label: etiquetas.antecedentesEnfermedad, value: patient.antecedentesEnfermedad },
            {
              label: ETIQUETAS_PSICOLOGIA.expectativasTratamiento,
              value: patient.expectativasTratamiento,
            },
            { label: ETIQUETAS_PSICOLOGIA.encuadre, value: patient.encuadre },
            {
              label: etiquetas.habitos,
              value: [
                patient.habitoAlcohol && "Alcohol",
                patient.habitoCigarrillos && (consumo ? "Tabaco" : "Cigarrillos"),
                patient.habitoDrogas && (consumo ? "Otras sustancias" : "Drogas"),
              ]
                .filter(Boolean)
                .join(", ") || null,
            },
          ]}
        >
          {patient.antecedentesEnfermedadDictado?.trim() && (
            <div className="mt-3 print:hidden">
              <DictadoCompleto dictado={patient.antecedentesEnfermedadDictado} />
            </div>
          )}
        </Seccion>

        <Seccion
          titulo="Antecedentes gineco-obstétricos"
          fields={datosGinecoObstetricos(
            patient,
            patient.antecedentes.some((a) => a.tipo === "EMBARAZO" && a.respuesta)
          )}
        />

        {(patient.antecedentes.length > 0 || patient.grupoFamiliar || patient.historiaVital) && (
          <Seccion titulo="Antecedentes personales">
            <div className="flex flex-col gap-3">
              {patient.antecedentes.length > 0 && (
                <ul className="flex flex-col gap-2 text-sm">
                  {patient.antecedentes.map((a) => {
                    const detalle = [a.fechaInicio, a.descripcion, a.medicacion, a.resolucion]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li key={a.id}>
                        <strong>{ANTECEDENTE_LABELS.get(a.tipo) ?? a.tipo}</strong>
                        {detalle && <span className="text-muted-foreground">{` — ${detalle}`}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
              {/* Solo historia clínica de psicología. */}
              <Datos
                fields={[
                  { label: ETIQUETAS_PSICOLOGIA.grupoFamiliar, value: patient.grupoFamiliar },
                  { label: ETIQUETAS_PSICOLOGIA.historiaVital, value: patient.historiaVital },
                ]}
              />
            </div>
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
          titulo="Evaluación nutricional"
          fields={[
            ...(grupo === "NUTRICION"
              ? datosEvaluacionNutricional(
                  patient,
                  esMenorDeEdad(patient.fechaNacimiento?.toISOString().slice(0, 10) ?? "")
                )
              : []),
            { label: ETIQUETAS_NUTRICION.habitosAlimentarios, value: patient.habitosAlimentarios },
            { label: ETIQUETAS_NUTRICION.recordatorio24h, value: patient.recordatorio24h },
          ]}
        />

        {EXAMENES_ESPECIALIDAD.map((examen) => (
          <Seccion key={examen.titulo} titulo={examen.titulo} fields={datosExamen(examen, patient)} />
        ))}

        <Seccion
          titulo="Examen psíquico"
          fields={EXAMEN_PSIQUICO.map((e) => ({ label: e.label, value: patient[e.campo] }))}
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
            { label: etiquetas.diagnosticoPresuntivo, value: patient.diagnosticoPresuntivo },
            { label: ETIQUETAS_PSICOLOGIA.enfoqueTerapeutico, value: patient.enfoqueTerapeutico },
            { label: etiquetas.tratamiento, value: patient.tratamiento },
            { label: etiquetas.metodosComplementarios, value: patient.metodosComplementarios },
          ]}
        />

        {patient.evoluciones.length > 0 && (
          <Seccion titulo={vocabularioEvolucion(sesiones).titulo}>
            <div className="flex flex-col gap-3 text-sm">
              {patient.evoluciones.map((e) => (
                <div key={e.id} className="break-inside-avoid">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {[
                      numerosSesion.has(e) ? `Sesión ${numerosSesion.get(e)}` : null,
                      formatFecha(e.fecha),
                      e.asistencia && e.asistencia !== "PRESENTE" ? ASISTENCIA_LABELS.get(e.asistencia) : null,
                      e.modalidad ? MODALIDAD_LABELS.get(e.modalidad) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {/* El riesgo y las notas privadas del psicólogo no van en la copia. */}
                  {e.contenido && <TextoConFormato texto={e.contenido} />}
                  <div className="mt-1 print:hidden">
                    <DictadoCompleto dictado={e.contenidoDictado} />
                  </div>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {patient.controles.length > 0 && (
          <Seccion titulo="Controles">
            <table className="w-full break-inside-avoid text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-3 font-semibold">Fecha</th>
                  {indicadoresControl.map((i) => (
                    <th key={i.id} className="py-1 pr-3 font-semibold">
                      {i.label} ({unidadIndicador(i, "rango")})
                    </th>
                  ))}
                  <th className="py-1 font-semibold">Nota</th>
                </tr>
              </thead>
              <tbody>
                {patient.controles.map((c) => (
                  <tr key={c.id} className="border-t border-border align-top">
                    <td className="py-1 pr-3 whitespace-nowrap">{formatFecha(c.fecha)}</td>
                    {indicadoresControl.map((i) => (
                      <td key={i.id} className="py-1 pr-3 tabular-nums">
                        {formatIndicador(i, c) ?? ""}
                      </td>
                    ))}
                    <td className="py-1">{c.nota}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Seccion>
        )}

        {visitasOdontograma.length > 0 && (
          <Seccion titulo="Visitas odontológicas">
            <div className="flex flex-col gap-3 text-sm">
              {visitasOdontograma.map((v) => {
                const nota = v.nota?.trim();
                const practicas = v.practicas.map(practicaVisitaFromDb);
                return (
                  <div key={v.id} className="break-inside-avoid">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {formatFecha(v.fecha)} — {v.tipo === "INICIAL" ? "Inicial" : "Control"}
                    </p>
                    {nota && <p className="whitespace-pre-wrap">{nota}</p>}
                    {practicas.length > 0 ? (
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {practicas.map((p) => (
                          <li key={p.id}>
                            <span className="font-mono text-xs text-muted-foreground tabular-nums">
                              {p.codigo}
                            </span>{" "}
                            <strong className="tabular-nums">{p.pieza ?? "Boca completa"}</strong>
                            {" · "}
                            {p.descripcion}
                            {p.caras.length > 0 && (
                              <span className="text-muted-foreground"> ({p.caras.join(" ")})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No se registraron prácticas en esta visita.
                      </p>
                    )}
                  </div>
                );
              })}
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
    </PageEnter>
  );
}
