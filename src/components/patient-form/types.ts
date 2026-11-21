import { TIPO_ANTECEDENTE_VALUES } from "@/lib/patient-schema";

export type TipoAntecedente = (typeof TIPO_ANTECEDENTE_VALUES)[number];

export type AntecedenteValue = {
  tipo: TipoAntecedente;
  respuesta: boolean;
  descripcion: string;
  fechaInicio: string;
  medicacion: string;
  resolucion: string;
};

export type PatientFormValues = {
  // Datos personales
  nombreYApellido: string;
  fechaNacimiento: string;
  sexo: "MASCULINO" | "FEMENINO" | "";
  estadoCivil: "SOLTERO" | "CASADO" | "VIUDO" | "CONCUBINO" | "";
  profesion: string;
  nroDocumento: string;
  nacionalidad: string;
  obraSocial: string;
  obraSocialNro: string;
  domicilio: string;
  telefono: string;
  contactoEmergencia: string;
  telefonoEmergencia: string;
  // Solo menores de edad.
  responsableNombre: string;
  responsableVinculo: string;
  responsableDni: string;
  responsableTelefono: string;

  // Consulta inicial
  autoValidoTotal: string;
  autoValidoParcial: string;
  dependiente: string;
  motivoConsulta: string;
  antecedentesEnfermedad: string;
  // Texto original dictado cuando `antecedentesEnfermedad` es un resumen de IA.
  antecedentesEnfermedadDictado: string;
  habitoAlcohol: boolean;
  habitoCigarrillos: boolean;
  habitoDrogas: boolean;

  // Solo historia clínica de psicología (ver esPsicologia()).
  derivadoPor: string;
  expectativasTratamiento: string;
  encuadre: string;
  grupoFamiliar: string;
  historiaVital: string;
  enfoqueTerapeutico: string;

  // Solo historia clínica de salud de la mujer (ver esGinecologica()).
  menarca: string;
  ritmoMenstrual: string;
  fum: string;
  menopausia: string;
  gestas: string;
  partos: string;
  cesareas: string;
  abortos: string;
  metodoAnticonceptivo: string;
  ultimoPap: string;
  ultimaMamografia: string;

  // Solo historia clínica de psiquiatría (ver esPsiquiatrica()).
  epAspecto: string;
  epConciencia: string;
  epAtencionMemoria: string;
  epPensamiento: string;
  epSensopercepcion: string;
  epAfectividad: string;
  epPsicomotricidad: string;
  epSuenoApetito: string;
  epJuicio: string;

  // Solo historia clínica de nutrición (ver esNutricion()).
  circunferenciaCintura: string;
  circunferenciaCadera: string;
  porcentajeGrasa: string;
  pesoObjetivo: string;
  actividadFisica: string;
  habitosAlimentarios: string;
  recordatorio24h: string;

  // Exámenes de órgano (oftalmología, ORL, dermatología).
  ofAvScOd: string;
  ofAvScOi: string;
  ofAvCcOd: string;
  ofAvCcOi: string;
  ofRefraccionOd: string;
  ofRefraccionOi: string;
  ofPioOd: string;
  ofPioOi: string;
  ofBiomicroscopiaOd: string;
  ofBiomicroscopiaOi: string;
  ofFondoOjoOd: string;
  ofFondoOjoOi: string;
  ofMotilidad: string;
  ofPupilas: string;
  orlOtoscopiaOd: string;
  orlOtoscopiaOi: string;
  orlRinoscopia: string;
  orlOrofaringe: string;
  orlLaringoscopia: string;
  orlCuello: string;
  orlAcumetria: string;
  orlAudiometria: string;
  orlVestibular: string;
  dermFototipo: string;
  dermLesiones: string;
  dermLocalizacion: string;
  dermDescripcion: string;
  dermDermatoscopia: string;
  dermFaneras: string;
  dermMucosas: string;

  // Examen fisico - signos vitales
  frecuenciaCardiaca: string;
  pulsoRadial: string;
  ritmo: string;
  presionArterial: string;
  frecuenciaRespiratoria: string;
  pesoActual: string;
  pesoHabitual: string;
  estatura: string;
  temperatura: string;

  // Examen fisico - cabeza / torax / cardiovascular
  craneo: string;
  ojo: string;
  oido: string;
  pcfg: string;
  toraxForma: string;
  toraxMamas: string;
  auscultacionMV: string;
  auscultacionVV: string;
  rales: string;
  excursion: string;
  acvR1: string;
  acvR2: string;
  soplos: string;
  carotideo: string;
  radial: string;
  femoral: string;
  pedio: string;
  ppRenalDerecha: string;
  ppRenalIzquierda: string;
  mamas: string;

  // Examen fisico - cuello
  cuelloPalpacion: string;
  cuelloTamanio: string;
  cuelloAuscultacion: string;

  // Examen fisico - abdomen
  abdomenInspeccion: string;
  abdomenPalpacion: string;
  abdomenAuscultacion: string;

  // Examen fisico - osteomuscular
  columnaCervical: string;
  dorsal: string;
  lumbar: string;
  articulaciones: string;
  movilidad: string;
  dolor: string;
  tumefaccion: string;

  // Examen fisico - sistema nervioso
  sensorio: string;
  lenguaje: string;
  marcha: string;
  temblor: string;
  taxia: string;
  reflejosFotomotor: string;
  reflejosAcomodacion: string;
  osteotendinosos: string;
  sensibilidad: string;

  // Diagnostico
  diagnosticoPresuntivo: string;
  metodosComplementarios: string;
  tratamiento: string;

  antecedentes: AntecedenteValue[];
};

export type EvolucionValue = {
  id?: string;
  fecha: string;
  contenido: string;
  // Texto original dictado cuando `contenido` es un resumen de IA.
  contenidoDictado?: string | null;
  deletedAt?: string | null;
  // Solo sesiones de psicología (ver esPsicologia()).
  asistencia?: import("./constants").AsistenciaSesion | null;
  modalidad?: import("./constants").ModalidadSesion | null;
  riesgo?: import("./constants").NivelRiesgo | null;
  notasPrivadas?: string | null;
};

// En qué campos se resume con IA apenas termina un dictado (ver
// `getResumenAutomatico`).
export type ResumenAutomatico = {
  antecedentes: boolean;
  evoluciones: boolean;
};

// Un snapshot del odontograma tal como lo usa el formulario (fecha ISO
// "YYYY-MM-DD", como las evoluciones). Sin `id` = todavía no se guardó.
export type OdontogramaValue = {
  id?: string;
  tipo: import("@/lib/odontograma").OdontogramaTipo;
  fecha: string;
  nota: string;
  datos: import("@/lib/odontograma").DatosOdontograma;
  // Prácticas del nomenclador cargadas en esta visita. Solo viene en la carga
  // inicial de la página: se guardan por su cuenta, no con la visita.
  practicas?: import("@/lib/practica-odontologica").PracticaVisita[];
};
