"use client";

import { motion } from "motion/react";
import { Quote } from "lucide-react";
import { TESTIMONIOS } from "@/lib/testimonios";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils";

export function Testimonials() {
  return (
    <section id="testimonios" className="border-t border-border/60 bg-muted/20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          kicker="Testimonios"
          title="Profesionales que ya simplificaron su día a día."
          className="mb-14"
        />

        {/* Mobile: swipe nativo con scroll-snap. Desktop: composición editorial asimétrica. */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0">
          {TESTIMONIOS.map((t, i) => (
            <motion.figure
              key={t.nombre}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
              className={cn(
                "flex w-[85%] shrink-0 snap-center flex-col gap-4 rounded-2xl border border-border/60 bg-card p-6 sm:w-auto sm:shrink",
                i === 1 && "sm:mt-8 sm:shadow-lg"
              )}
            >
              <Quote className="size-6 text-primary/30" />
              <blockquote className="flex-1 text-sm text-pretty">&ldquo;{t.texto}&rdquo;</blockquote>
              <figcaption>
                <p className="text-sm font-semibold">{t.nombre}</p>
                <p className="text-xs text-muted-foreground">{t.rol}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
