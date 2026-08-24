import { z } from "zod";

const optionalString = z
  .string()
  .trim()
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
  fecha: z.string().trim().min(1, "La fecha es obligatoria."),
  contenido: z.string().trim().min(1, "El contenido es obligatorio."),
});

export const patientSchema = z.object({
  // Datos personales
  nombreYApellido: z.string().trim().min(1, "El nombre y apellido es obligatorio."),
  fechaNacimiento: z
    .string()
    .trim()
    .min(1, "La fecha de nacimiento es obligatoria.")
    .transform((value) => new Date(value)),
  sexo: z.enum(["MASCULINO", "FEMENINO"], {
    message: "El sexo es obligatorio.",
  }),
  estadoCivil: z.enum(["SOLTERO", "CASADO", "VIUDO", "CONCUBINO"], {
    message: "El estado civil es obligatorio.",
  }),
  profesion: optionalString,
  nroDocumento: z
    .string()
    .trim()
    .min(1, "El número de documento es obligatorio.")
    .regex(/^\d+$/, "El número de documento solo puede contener números."),
  nacionalidad: optionalString,
  obraSocial: optionalString,
  obraSocialNro: optionalString,
  domicilio: z.string().trim().min(1, "El domicilio es obligatorio."),
  telefono: z
    .string()
    .trim()
    .min(1, "El teléfono es obligatorio.")
    .regex(/^\+?\d+$/, "El teléfono solo puede contener números y, opcionalmente, un + inicial."),
  contactoEmergencia: z.string().trim().min(1, "El contacto de emergencia es obligatorio."),
  telefonoEmergencia: z
    .string()
    .trim()
    .min(1, "El teléfono de emergencia es obligatorio.")
    .regex(
      /^\+?\d+$/,
      "El teléfono de emergencia solo puede contener números y, opcionalmente, un + inicial."
    ),

  // Consulta inicial
  autoValidoTotal: optionalString,
  autoValidoParcial: optionalString,
  dependiente: optionalString,
  motivoConsulta: z.string().trim().min(1, "El motivo de consulta es obligatorio."),
  antecedentesEnfermedad: optionalString,
  habitoAlcohol: z.boolean().default(false),
  habitoCigarrillos: z.boolean().default(false),
  habitoDrogas: z.boolean().default(false),

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
  diagnosticoPresuntivo: optionalString,
  metodosComplementarios: optionalString,
  tratamiento: optionalString,

  antecedentes: z.array(antecedenteSchema).default([]),
  evoluciones: z.array(evolucionSchema).default([]),
});

export type PatientInput = z.infer<typeof patientSchema>;
