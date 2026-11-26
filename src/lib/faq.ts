import { teleconsultaHabilitada } from "@/lib/feature-flags";

// Fuente única de las preguntas frecuentes: las usa la sección visible de la
// home, el JSON-LD `FAQPage` (ver `components/seo/json-ld.tsx`) y
// llms-full.txt. Usar `getFaqs()`: suma lo de teleconsulta solo si la
// plataforma la tiene prendida (TELECONSULTA_HABILITADA).
const PLAN_SIN_TELECONSULTA =
  "Básico cubre historia clínica, turnos, asistentes y recordatorios manuales. Premium suma el dictado con transcripción automática, resúmenes y autocompletado con IA, el perfil destacado en el Directorio de profesionales (mejor posición en las búsquedas y una tarjeta ampliada con tus coberturas, tu próximo turno libre y reserva directa).";
const PLAN_CON_TELECONSULTA =
  "Básico cubre historia clínica, turnos, asistentes y recordatorios manuales. Premium suma la teleconsulta por videollamada, el dictado con transcripción automática, resúmenes y autocompletado con IA, y el perfil destacado en el Directorio de profesionales (mejor posición en las búsquedas y una tarjeta ampliada con tus coberturas, tu próximo turno libre y reserva directa).";

const FAQ_TELECONSULTA = {
  q: "¿Puedo atender por videollamada?",
  a: "Sí, con el plan Premium. Tu paciente entra a la consulta desde el link que le llega en el recordatorio, desde el celular o la computadora y sin descargar nada. Podés tener una agenda solo de teleconsultas, con reserva online, o pasar a videollamada un turno presencial sin cambiarle el horario. Al reservar una teleconsulta online, el paciente acepta la atención a distancia (Ley 27.553); si pasás un turno presencial a videollamada, podés dejar registrado su consentimiento.",
};

const FAQS_BASE = [
  {
    q: "¿Qué es Semio360?",
    a: "Semio360 (o Semio 360) es una plataforma en la nube para profesionales de la salud (médicos, odontólogos, psicólogos y nutricionistas) que reúne la gestión de tu consultorio: turnos, historia clínica y evolución de tus pacientes, todo en un mismo lugar.",
  },
  {
    q: "¿Cómo empiezo?",
    a: "Te registrás en un par de minutos y arrancás con un período de prueba gratis, sin tarjeta de crédito: 60 días del plan Básico o 30 días del Premium.",
  },
  {
    q: "Ya uso otro sistema, Excel o Word. ¿Tengo que cargar todo de nuevo?",
    a: "No. Pasamos tus pacientes a Semio360 sin cargo y sin tope: los datos de cada paciente y, siempre que el formato lo permita, también sus evoluciones. Una vez registrado, subís los archivos desde Configuración > Mis datos, dentro de la app (el export de tu sistema actual, planillas de Excel o CSV, o documentos de Word): nunca por mail ni WhatsApp, y se borran solos cuando terminamos. No trabajamos con PDF escaneados ni historias en papel.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. Semio360 corre en el navegador, sin instalación, incluido el dictado de la evolución: solo necesitás un micrófono.",
  },
  {
    q: "¿Cómo funciona la historia clínica?",
    a: "Cada paciente tiene una ficha única con datos personales, antecedentes, evolución y consentimientos informados, registrada de forma cronológica y centralizada conforme a la Ley 26.529.",
  },
  {
    q: "¿Cómo funcionan los turnos?",
    a: "Configurás tus días y horarios de atención una vez, y el sistema arma la agenda disponible sola. Los recordatorios de turno por WhatsApp se envían desde la app con un clic.",
  },
  {
    q: "¿Qué plan necesito?",
    a: PLAN_SIN_TELECONSULTA,
  },
  {
    q: "¿Cómo se protege la información de mis pacientes?",
    a: "Cada profesional ve únicamente los datos de sus propios pacientes, el acceso es por usuario con roles diferenciados, y cada cambio queda auditado -- quién, qué y cuándo.",
  },
];

export function getFaqs() {
  if (!teleconsultaHabilitada()) return FAQS_BASE;
  return FAQS_BASE.flatMap((item) => {
    if (item.q === "¿Qué plan necesito?") return [FAQ_TELECONSULTA, { ...item, a: PLAN_CON_TELECONSULTA }];
    return [item];
  });
}
