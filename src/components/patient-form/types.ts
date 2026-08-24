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

  // Consulta inicial
  autoValidoTotal: string;
  autoValidoParcial: string;
  dependiente: string;
  motivoConsulta: string;
  antecedentesEnfermedad: string;
  habitoAlcohol: boolean;
  habitoCigarrillos: boolean;
  habitoDrogas: boolean;

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
};
