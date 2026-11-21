import type { GrupoEspecialidad } from "@/lib/especialidad";

// Texto base para el consentimiento informado de un tratamiento
// psicológico. Es un punto de partida: el profesional lo revisa y ajusta en
// el diálogo antes de guardarlo (una vez guardado no se edita, ver
// ConsentimientoInformado en prisma/schema.prisma).
//
// Lo del dictado tiene que coincidir con lo que dicen los términos (sección
// "Dictado y transcripción de audio"): el audio va a un proveedor externo de
// transcripción y Semio360 no lo guarda, solo el texto.
export const PLANTILLA_PSICOTERAPIA = {
  procedimiento: "Psicoterapia individual",
  riesgosBeneficios: `Naturaleza del tratamiento: entrevistas periódicas en las que se trabajan las problemáticas que motivan la consulta, con la frecuencia, modalidad (presencial u online) y honorarios acordados.

Beneficios esperados: alivio del malestar, mayor comprensión de lo que le sucede y desarrollo de recursos para afrontarlo. Los resultados no pueden garantizarse y dependen en parte de la continuidad del tratamiento.

Posibles molestias: durante el proceso pueden aparecer emociones o recuerdos dolorosos, y es posible sentirse peor transitoriamente antes de mejorar.

Confidencialidad: lo conversado en las sesiones está protegido por el secreto profesional. Sus únicos límites son los que fija la ley: riesgo cierto e inminente para la vida del paciente o de terceros, orden judicial, o situaciones de abuso o violencia contra niños, niñas, adolescentes o personas en situación de vulnerabilidad.

Registro de las sesiones: el profesional lleva una historia clínica del tratamiento. Para redactar sus notas puede grabar el audio de la sesión, que se envía a un servicio externo de transcripción y no se conserva: solo queda el texto en la historia clínica. Puede pedir que no se grabe en cualquier momento.`,
  alternativas:
    "Puede interrumpir el tratamiento cuando lo desee. Otras alternativas: otro enfoque o profesional, un dispositivo grupal, o una interconsulta psiquiátrica si fuera necesario.",
};

export type PlantillaConsentimiento = {
  id: string;
  // Nombre corto del botón en el diálogo.
  label: string;
  procedimiento: string;
  riesgosBeneficios: string;
  alternativas: string;
};

export const PLANTILLAS_PSICOLOGIA: readonly PlantillaConsentimiento[] = [
  { id: "psicoterapia", label: "Psicoterapia", ...PLANTILLA_PSICOTERAPIA },
];

// Texto base para fonoaudiólogos. Muchos pacientes son menores: el texto
// habla del paciente "o su representante". Lo del dictado, igual que en
// psicoterapia, tiene que coincidir con los términos.
export const PLANTILLAS_FONOAUDIOLOGIA: readonly PlantillaConsentimiento[] = [
  {
    id: "tratamiento-fonoaudiologico",
    label: "Tratamiento fonoaudiológico",
    procedimiento: "Evaluación y tratamiento fonoaudiológico",
    riesgosBeneficios: `Naturaleza del tratamiento: una evaluación inicial (entrevista, pruebas de lenguaje, habla, voz, audición o deglución, según el motivo de consulta) y sesiones periódicas con la frecuencia, modalidad (presencial u online) y honorarios acordados. Puede incluir ejercicios para realizar en el hogar o la escuela.

Beneficios esperados: mejorar la comunicación, el lenguaje, el habla, la voz, la audición o la deglución, según los objetivos acordados. Los resultados no pueden garantizarse y dependen en parte de la continuidad del tratamiento y de la práctica fuera de las sesiones.

Posibles molestias: cansancio o fatiga vocal transitoria con algunos ejercicios. En la terapia de deglución, las pruebas con alimentos se hacen con las consistencias y precauciones que indique el profesional.

Interconsultas: si el profesional lo considera necesario, puede sugerir estudios o la consulta con otros profesionales (otorrinolaringología, neurología, pediatría, psicopedagogía, entre otros) y, con autorización del paciente o su representante, intercambiar información con ellos o con la escuela.

Registro de las sesiones: el profesional lleva una historia clínica del tratamiento. Para redactar sus notas puede grabar el audio de la sesión, que se envía a un servicio externo de transcripción y no se conserva: solo queda el texto en la historia clínica. Puede pedir que no se grabe en cualquier momento.`,
    alternativas:
      "Puede interrumpir el tratamiento cuando lo desee. Otras alternativas: otro profesional o abordaje, controles periódicos sin tratamiento, o no realizarlo, asumiendo que la dificultad puede persistir o avanzar.",
  },
];

// Texto base para psiquiatras: tratamiento con psicofármacos. Igual que los
// otros, el profesional lo ajusta al caso (droga, controles) antes de guardar,
// y lo del dictado tiene que coincidir con los términos.
export const PLANTILLAS_PSIQUIATRIA: readonly PlantillaConsentimiento[] = [
  {
    id: "tratamiento-psicofarmacologico",
    label: "Tratamiento psicofarmacológico",
    procedimiento: "Tratamiento psiquiátrico con psicofármacos",
    riesgosBeneficios: `Naturaleza del tratamiento: consultas de seguimiento con la frecuencia acordada y la indicación de uno o más psicofármacos, cuya dosis puede ajustarse según la respuesta y la tolerancia. Algunos requieren estudios de control (laboratorio, electrocardiograma).

Beneficios esperados: alivio de los síntomas que motivan la consulta y prevención de recaídas. La respuesta suele tardar algunas semanas y no puede garantizarse.

Posibles efectos adversos: según la medicación, somnolencia, mareos, cambios de peso o de apetito, molestias digestivas, alteraciones del sueño o de la función sexual, entre otros. Debe tomarse como fue indicada, no suspenderse de golpe y avisar ante cualquier efecto adverso, embarazo o lactancia, y antes de tomar otros medicamentos o alcohol.

Confidencialidad: lo conversado en las consultas está protegido por el secreto profesional, con los únicos límites que fija la ley (riesgo cierto e inminente para la vida del paciente o de terceros, orden judicial, o situaciones de abuso o violencia contra personas en situación de vulnerabilidad).

Registro de las consultas: el profesional lleva una historia clínica del tratamiento. Para redactar sus notas puede grabar el audio de la consulta, que se envía a un servicio externo de transcripción y no se conserva: solo queda el texto en la historia clínica. Puede pedir que no se grabe en cualquier momento.`,
    alternativas:
      "Puede interrumpir el tratamiento cuando lo desee, preferentemente acordándolo con el profesional. Otras alternativas: otra medicación, psicoterapia sola o combinada, otro profesional, o no realizar tratamiento, asumiendo que los síntomas pueden persistir o empeorar.",
  },
];

// Textos base para odontólogos. Igual que el de psicoterapia, son un punto de
// partida que el profesional ajusta al caso antes de guardar.
export const PLANTILLAS_ODONTOLOGIA: readonly PlantillaConsentimiento[] = [
  {
    id: "general",
    label: "Tratamiento general",
    procedimiento: "Tratamiento odontológico con anestesia local",
    riesgosBeneficios: `Tratamiento: prácticas odontológicas de rutina (operatoria, obturaciones, limpieza, tartrectomía y las que surjan del plan de tratamiento acordado), en las que puede ser necesario aplicar anestesia local.

Beneficios esperados: eliminar el dolor o la infección, recuperar la función y la estética de las piezas tratadas y evitar que el problema avance.

Riesgos de la anestesia local: adormecimiento de labios, lengua y mejilla durante algunas horas (evitar morderse y comer hasta que pase), hematoma o dolor en la zona de la punción, palpitaciones o mareo transitorios, y muy raramente reacciones alérgicas o alteraciones de la sensibilidad que pueden durar más tiempo.

Riesgos del tratamiento: sensibilidad posoperatoria al frío o al calor, molestias al masticar los primeros días, y que una caries profunda termine requiriendo un tratamiento de conducto o la extracción de la pieza.

El paciente declara haber informado sus enfermedades, la medicación que toma (en especial anticoagulantes o bifosfonatos), sus alergias y, si corresponde, un posible embarazo.`,
    alternativas:
      "No realizar el tratamiento (con riesgo de que el problema avance), postergarlo, u otras opciones de tratamiento o materiales que se conversaron en la consulta.",
  },
  {
    id: "exodoncia",
    label: "Exodoncia",
    procedimiento: "Exodoncia (extracción dentaria)",
    riesgosBeneficios: `Tratamiento: extracción de la/s pieza/s indicada/s, con anestesia local. Puede requerir separar la pieza en partes, levantar la encía o retirar hueso, y colocar puntos de sutura.

Beneficios esperados: eliminar el foco de dolor o infección y evitar complicaciones en las piezas vecinas.

Riesgos y consecuencias: dolor, inflamación y hematoma durante algunos días; sangrado posoperatorio; alveolitis (infección del alvéolo); fractura de raíces que obligue a dejar un fragmento o a una cirugía mayor; daño a piezas o restauraciones vecinas; limitación para abrir la boca; comunicación con el seno maxilar en piezas superiores; y en piezas inferiores, alteración de la sensibilidad del labio, el mentón o la lengua, por lo general transitoria y excepcionalmente permanente.

Después de la extracción queda un espacio que puede requerir una prótesis o un implante para no perder función ni que se muevan las otras piezas.

El paciente declara haber informado sus enfermedades, la medicación que toma (en especial anticoagulantes o bifosfonatos), sus alergias y, si corresponde, un posible embarazo, y se compromete a seguir las indicaciones posoperatorias.`,
    alternativas:
      "Conservar la pieza con otro tratamiento cuando sea posible (tratamiento de conducto, restauración), postergar la extracción con controles, o no realizarla, asumiendo el riesgo de dolor e infección.",
  },
  {
    id: "endodoncia",
    label: "Endodoncia",
    procedimiento: "Endodoncia (tratamiento de conducto)",
    riesgosBeneficios: `Tratamiento: con anestesia local, se retira la pulpa (nervio) de la pieza, se limpian y desinfectan los conductos y se los rellena. Puede llevar más de una sesión y requiere radiografías de control.

Beneficios esperados: eliminar el dolor y la infección conservando la pieza en boca.

Riesgos y consecuencias: dolor o inflamación los días posteriores; fractura de un instrumento dentro del conducto; perforación de la raíz; conductos calcificados o curvos que impidan completar el tratamiento; persistencia de la infección que requiera retratamiento, una cirugía o la extracción. La pieza tratada queda más frágil y en general necesita una restauración definitiva o una corona para no fracturarse.

El éxito del tratamiento es alto pero no puede garantizarse.`,
    alternativas:
      "Extracción de la pieza (con la posterior colocación de una prótesis o un implante si se quiere reponer), o no realizar el tratamiento, con riesgo de dolor, absceso y pérdida de la pieza.",
  },
  {
    id: "implante",
    label: "Implantes",
    procedimiento: "Colocación de implante/s dental/es",
    riesgosBeneficios: `Tratamiento: cirugía con anestesia local para colocar uno o más implantes de titanio en el hueso, que después de un período de integración (habitualmente de 3 a 6 meses) reciben la prótesis. Puede requerir injerto de hueso o una segunda cirugía.

Beneficios esperados: reponer las piezas perdidas con una prótesis fija, recuperando la masticación y la estética sin desgastar las piezas vecinas.

Riesgos y consecuencias: dolor, inflamación y hematoma los primeros días; sangrado; infección; que el implante no se integre al hueso y deba retirarse; daño a estructuras vecinas (nervio dentario, seno maxilar, raíces), con alteración de la sensibilidad por lo general transitoria; y a largo plazo, inflamación o pérdida de hueso alrededor del implante (periimplantitis).

Fumar, la diabetes no controlada, los bifosfonatos y una mala higiene aumentan el riesgo de fracaso. El resultado depende también de los controles periódicos y del cuidado del paciente.`,
    alternativas:
      "Prótesis fija sobre piezas vecinas (puente), prótesis removible, o no reponer las piezas perdidas.",
  },
];

// Plantillas que se ofrecen en el diálogo de nuevo consentimiento.
export function plantillasConsentimiento(grupo: GrupoEspecialidad): readonly PlantillaConsentimiento[] {
  if (grupo === "PSICOLOGIA") return PLANTILLAS_PSICOLOGIA;
  if (grupo === "ODONTOLOGICA") return PLANTILLAS_ODONTOLOGIA;
  if (grupo === "FONOAUDIOLOGIA") return PLANTILLAS_FONOAUDIOLOGIA;
  if (grupo === "PSIQUIATRICA") return PLANTILLAS_PSIQUIATRIA;
  return [];
}
