import { z } from "zod";
import { dniSchema } from "@/lib/dni";
import { odontogramaInputSchema } from "@/lib/odontograma";
import { esFechaValida, MENSAJE_FECHA_INVALIDA, TEXTO_CORTO, TEXTO_LARGO, TEXTO_MEDIO } from "@/lib/limites-texto";

// Texto opcional: vacío -> null. `max` acota el largo (ver limites-texto.ts).
function textoOpcional(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();
}

const optionalString = textoOpcional(TEXTO_MEDIO);
const optionalShortString = textoOpcional(TEXTO_CORTO);
const optionalLongString = textoOpcional(TEXTO_LARGO);

const optionalPhoneString = z
  .string()
  .trim()
  .max(50, "El teléfono es demasiado largo.")
  .regex(/^\+?\d*$/, "Solo puede contener números y, opcionalmente, un + inicial.")
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const TIPO_ANTECEDENTE_VALUES = [
  "DISLIPEMIA",
  "HIPOTIROIDISMO",
  "HIPERTIROIDISMO",
  "ARTRITIS",
  "DIABETES",
  "ALERGIA",
  "NEOPLASIAS",
  "ARRITMIAS",
  "HTA",
  "ARTROSIS",
  "ALCOHOLISMO",
  "PSIQUIATRICAS",
  "INFECCIOSAS",
  "PROSTATA",
  "NOD_MAMAS",
  "EPOC",
  "CARDIOPATIAS",
  "NEUROLOGICAS",
  "ASMA",
  "TRATAMIENTO_PSICOLOGICO_PREVIO",
  "TRATAMIENTO_PSIQUIATRICO_PREVIO",
  "MEDICACION_PSIQUIATRICA",
  "INTERNACIONES_PSIQUIATRICAS",
  "CONSUMO_SUSTANCIAS",
  "AUTOLESIONES",
  "INTENTOS_SUICIDIO",
  "SALUD_MENTAL_FAMILIAR",
  "SITUACIONES_TRAUMATICAS",
  "ENFERMEDADES_MEDICAS",
  "ALERGIA_ANESTESICOS",
  "ALERGIA_ANTIBIOTICOS",
  "ALERGIA_LATEX",
  "ANTICOAGULANTES",
  "BIFOSFONATOS",
  "TRASTORNOS_COAGULACION",
  "ENDOCARDITIS_RIESGO",
  "EMBARAZO",
  "RADIOTERAPIA_CABEZA_CUELLO",
  "BRUXISMO",
  "OTROS",
] as const;

const antecedenteSchema = z.object({
  tipo: z.enum(TIPO_ANTECEDENTE_VALUES),
  respuesta: z.boolean().default(false),
  descripcion: optionalString,
  fechaInicio: optionalString,
  medicacion: optionalString,
  resolucion: optionalString,
});

const evolucionSchema = z.object({
  fecha: z.string().trim().min(1, "La fecha es obligatoria.").refine(esFechaValida, MENSAJE_FECHA_INVALIDA),
  contenido: z.string().trim().min(1, "El contenido es obligatorio.").max(TEXTO_LARGO),
  contenidoDictado: optionalLongString,
});

export const patientSchema = z.object({
  // Datos personales
  nombreYApellido: z.string().trim().min(1, "El nombre y apellido es obligatorio.").max(TEXTO_CORTO),
  fechaNacimiento: z
    .string()
    .trim()
    .min(1, "La fecha de nacimiento es obligatoria.")
    .refine(esFechaValida, MENSAJE_FECHA_INVALIDA)
    .transform((value) => new Date(value)),
  sexo: z.enum(["MASCULINO", "FEMENINO"], {
    message: "El sexo es obligatorio.",
  }),
  estadoCivil: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional()
    .pipe(z.enum(["SOLTERO", "CASADO", "VIUDO", "CONCUBINO"]).nullable().optional()),
  profesion: optionalShortString,
  nroDocumento: dniSchema,
  nacionalidad: optionalShortString,
  obraSocial: optionalShortString,
  obraSocialNro: optionalShortString,
  domicilio: z.string().trim().min(1, "El domicilio es obligatorio.").max(TEXTO_CORTO),
  telefono: z
    .string()
    .trim()
    .min(1, "El teléfono es obligatorio.")
    .max(50, "El teléfono es demasiado largo.")
    .regex(/^\+?\d+$/, "El teléfono solo puede contener números y, opcionalmente, un + inicial."),
  contactoEmergencia: optionalShortString,
  telefonoEmergencia: optionalPhoneString,
  // Solo menores de edad.
  responsableNombre: optionalShortString,
  responsableVinculo: optionalShortString,
  responsableDni: optionalShortString,
  responsableTelefono: optionalPhoneString,

  // Consulta inicial
  autoValidoTotal: optionalString,
  autoValidoParcial: optionalString,
  dependiente: optionalString,
  motivoConsulta: z.string().trim().min(1, "El motivo de consulta es obligatorio.").max(TEXTO_LARGO),
  antecedentesEnfermedad: optionalLongString,
  antecedentesEnfermedadDictado: optionalLongString,
  habitoAlcohol: z.boolean().default(false),
  habitoCigarrillos: z.boolean().default(false),
  habitoDrogas: z.boolean().default(false),

  // Solo historia clínica de psicología (ver esPsicologia()).
  derivadoPor: optionalShortString,
  expectativasTratamiento: optionalLongString,
  encuadre: optionalLongString,
  grupoFamiliar: optionalLongString,
  historiaVital: optionalLongString,
  enfoqueTerapeutico: optionalLongString,

  // Examen fisico - signos vitales
  frecuenciaCardiaca: optionalString,
  pulsoRadial: optionalString,
  ritmo: optionalString,
  presionArterial: optionalString,
  frecuenciaRespiratoria: optionalString,
  pesoActual: optionalString,
  pesoHabitual: optionalString,
  estatura: optionalString,
  temperatura: optionalString,

  // Examen fisico - cabeza / torax / cardiovascular
  craneo: optionalString,
  ojo: optionalString,
  oido: optionalString,
  pcfg: optionalString,
  toraxForma: optionalString,
  toraxMamas: optionalString,
  auscultacionMV: optionalString,
  auscultacionVV: optionalString,
  rales: optionalString,
  excursion: optionalString,
  acvR1: optionalString,
  acvR2: optionalString,
  soplos: optionalString,
  carotideo: optionalString,
  radial: optionalString,
  femoral: optionalString,
  pedio: optionalString,
  ppRenalDerecha: optionalString,
  ppRenalIzquierda: optionalString,
  mamas: optionalString,

  // Examen fisico - cuello
  cuelloPalpacion: optionalString,
  cuelloTamanio: optionalString,
  cuelloAuscultacion: optionalString,

  // Examen fisico - abdomen
  abdomenInspeccion: optionalString,
  abdomenPalpacion: optionalString,
  abdomenAuscultacion: optionalString,

  // Examen fisico - osteomuscular
  columnaCervical: optionalString,
  dorsal: optionalString,
  lumbar: optionalString,
  articulaciones: optionalString,
  movilidad: optionalString,
  dolor: optionalString,
  tumefaccion: optionalString,

  // Examen fisico - sistema nervioso
  sensorio: optionalString,
  lenguaje: optionalString,
  marcha: optionalString,
  temblor: optionalString,
  taxia: optionalString,
  reflejosFotomotor: optionalString,
  reflejosAcomodacion: optionalString,
  osteotendinosos: optionalString,
  sensibilidad: optionalString,

  // Diagnostico
  diagnosticoPresuntivo: optionalLongString,
  metodosComplementarios: optionalLongString,
  tratamiento: optionalLongString,

  antecedentes: z.array(antecedenteSchema).max(200).default([]),
  evoluciones: z.array(evolucionSchema).max(500).default([]),

  // Solo en el alta y solo para odontólogos (la API lo ignora si el tenant
  // no tiene especialidad odontológica). En edición, el odontograma se guarda
  // por su cuenta en /api/patients/[id]/odontogramas.
  odontogramaInicial: odontogramaInputSchema.omit({ tipo: true }).nullable().optional(),
});

export type PatientInput = z.infer<typeof patientSchema>;
