import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQS } from "@/lib/faq";
import { SectionHeading } from "./section-heading";

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
