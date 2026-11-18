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
