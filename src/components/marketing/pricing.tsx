"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAN_FEATURES } from "@/lib/plan";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils";

// Reusa `PLAN_FEATURES` de `@/lib/plan` -- la misma fuente que usa el resto
// de la app (Configuración > Mi plan) -- para no duplicar el contenido. No
// hay precio/moneda en ningún lado del producto todavía, así que no se
// muestra ninguno acá tampoco.
const PLANS = [
  {
    key: "BASICA" as const,
    name: "Básica",
    tagline: "Para empezar a ordenar el consultorio.",
    featured: false,
  },
  {
    key: "PREMIUM" as const,
    name: "Premium",
    tagline: "Para consultorios que quieren automatizar al máximo.",
    featured: true,
  },
];

export function Pricing() {
  return (
    <section id="planes" className="border-t border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4">
        <SectionHeading
          kicker="Planes"
          title="Empezá gratis, subí cuando lo necesites"
          description="Los dos planes incluyen 3 meses de prueba gratis, sin tarjeta."
          className="mb-14"
        />

        <div className="grid gap-6 sm:grid-cols-2">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className={cn(
                "flex flex-col gap-5 rounded-2xl border p-6 sm:p-7",
                plan.featured ? "border-primary/40 bg-primary/[0.04] shadow-lg shadow-primary/5" : "border-border/60 bg-card"
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
                  {plan.featured && <Badge>Recomendado</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              </div>
              <ul className="flex flex-col gap-2.5 text-sm">
                {PLAN_FEATURES[plan.key].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-auto"
                variant={plan.featured ? "default" : "outline"}
                nativeButton={false}
                render={<Link href="/signup" />}
              >
                {plan.featured ? "Empezar" : "Empezar gratis"}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
