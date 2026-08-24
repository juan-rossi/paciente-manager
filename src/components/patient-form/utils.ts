import { ANTECEDENTES_ORDEN } from "./constants";
import type { AntecedenteValue, EvolucionValue, PatientFormValues } from "./types";

const TEXT_FIELDS = [
  "nombreYApellido",
  "profesion",
  "nroDocumento",
  "nacionalidad",
  "obraSocial",
  "obraSocialNro",
  "domicilio",
  "telefono",
  "contactoEmergencia",
  "telefonoEmergencia",
  "autoValidoTotal",
  "autoValidoParcial",
  "dependiente",
  "motivoConsulta",
  "antecedentesEnfermedad",
  "frecuenciaCardiaca",
  "pulsoRadial",
  "ritmo",
  "presionArterial",
  "frecuenciaRespiratoria",
  "pesoActual",
  "pesoHabitual",
  "estatura",
  "temperatura",
  "craneo",
  "ojo",
  "oido",
  "pcfg",
  "toraxForma",
  "toraxMamas",
  "auscultacionMV",
  "auscultacionVV",
  "rales",
  "excursion",
  "acvR1",
  "acvR2",
  "soplos",
  "carotideo",
  "radial",
  "femoral",
  "pedio",
  "ppRenalDerecha",
  "ppRenalIzquierda",
  "mamas",
  "cuelloPalpacion",
  "cuelloTamanio",
  "cuelloAuscultacion",
  "abdomenInspeccion",
  "abdomenPalpacion",
  "abdomenAuscultacion",
  "columnaCervical",
  "dorsal",
  "lumbar",
  "articulaciones",
  "movilidad",
  "dolor",
  "tumefaccion",
  "sensorio",
  "lenguaje",
  "marcha",
  "temblor",
  "taxia",
  "reflejosFotomotor",
  "reflejosAcomodacion",
  "osteotendinosos",
  "sensibilidad",
  "diagnosticoPresuntivo",
  "metodosComplementarios",
  "tratamiento",
] as const satisfies readonly (keyof PatientFormValues)[];

function emptyAntecedentes(): AntecedenteValue[] {
  return ANTECEDENTES_ORDEN.map(({ tipo }) => ({
    tipo,
    respuesta: false,
    descripcion: "",
    fechaInicio: "",
    medicacion: "",
    resolucion: "",
  }));
}

export function emptyPatientFormValues(): PatientFormValues {
  const base = Object.fromEntries(TEXT_FIELDS.map((field) => [field, ""])) as Record<
    (typeof TEXT_FIELDS)[number],
    string
  >;

  return {
    ...base,
    fechaNacimiento: "",
    sexo: "",
    estadoCivil: "",
    habitoAlcohol: false,
    habitoCigarrillos: false,
    habitoDrogas: false,
    antecedentes: emptyAntecedentes(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function patientFromApi(patient: any): {
  values: PatientFormValues;
  evoluciones: EvolucionValue[];
} {
  const base = emptyPatientFormValues();

  for (const field of TEXT_FIELDS) {
    if (typeof patient[field] === "string") {
      base[field] = patient[field];
    }
  }

  base.fechaNacimiento = patient.fechaNacimiento
    ? String(patient.fechaNacimiento).slice(0, 10)
    : "";
  base.sexo = patient.sexo ?? "";
  base.estadoCivil = patient.estadoCivil ?? "";
  base.habitoAlcohol = Boolean(patient.habitoAlcohol);
  base.habitoCigarrillos = Boolean(patient.habitoCigarrillos);
  base.habitoDrogas = Boolean(patient.habitoDrogas);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const antecedentesByTipo = new Map<string, any>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (patient.antecedentes ?? []).map((a: any) => [a.tipo, a] as const)
  );

  base.antecedentes = ANTECEDENTES_ORDEN.map(({ tipo }) => {
    const existing = antecedentesByTipo.get(tipo);
    return {
      tipo,
      respuesta: existing ? Boolean(existing.respuesta) : false,
      descripcion: existing?.descripcion ?? "",
      fechaInicio: existing?.fechaInicio ?? "",
      medicacion: existing?.medicacion ?? "",
      resolucion: existing?.resolucion ?? "",
    };
  });

  const evoluciones: EvolucionValue[] = (patient.evoluciones ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => ({
      id: e.id,
      fecha: String(e.fecha).slice(0, 10),
      contenido: e.contenido ?? "",
    })
  );

  return { values: base, evoluciones };
}

export function calcularEdad(fechaNacimiento: string): string {
  if (!fechaNacimiento) return "";
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return "";

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad -= 1;
  }
  return edad >= 0 ? String(edad) : "";
}
