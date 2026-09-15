import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SectionHeading } from "./section-heading";

const FAQS = [
  {
    q: "¿Qué es Semio360?",
    a: "Una plataforma en la nube para gestionar tu consultorio: turnos, historia clínica y evolución de tus pacientes, todo en un mismo lugar.",
  },
  {
    q: "¿Cómo empiezo?",
    a: "Te registrás en un par de minutos y arrancás con 3 meses de prueba gratis, sin tarjeta de crédito.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. Semio360 corre en el navegador, sin instalación. El único componente opcional es el transcriptor de audio, un programa liviano para dictar la evolución sin que el audio salga de tu computadora.",
  },
  {
    q: "¿Cómo funciona la historia clínica?",
    a: "Cada paciente tiene una ficha única con datos personales, antecedentes, evolución y consentimientos informados, registrada de forma cronológica y centralizada conforme a la Ley 26.529.",
  },
  {
    q: "¿Cómo funcionan los turnos?",
    a: "Configurás tus días y horarios de atención una vez, y el sistema arma la agenda disponible sola. Los recordatorios de turno por WhatsApp se envían manualmente en el plan Básica; el envío automático está en camino para Premium.",
  },
  {
    q: "¿Qué plan necesito?",
    a: "Básica cubre historia clínica, turnos, transcripción y recordatorios manuales. Premium suma resúmenes y autocompletado con IA, más el envío automático de recordatorios cuando esté disponible.",
  },
  {
    q: "¿Cómo se protege la información de mis pacientes?",
    a: "Cada médico ve únicamente los datos de sus propios pacientes, el acceso es por usuario con roles diferenciados, y cada cambio queda auditado -- quién, qué y cuándo.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="border-t border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl px-4">
        <SectionHeading kicker="Preguntas frecuentes" title="Todo lo que necesitás saber" className="mb-12" />
        <Accordion className="rounded-2xl border border-border/60 bg-card px-5">
          {FAQS.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="text-base">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
