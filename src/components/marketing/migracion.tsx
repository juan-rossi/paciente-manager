"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { ArrowRight, Check, FileSpreadsheet, FileText, Info, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppWindow } from "./app-window";
import { SectionHeading } from "./section-heading";
import { EASE_OUT, IN_VIEW } from "./motion-tokens";

// Migración de pacientes sin cargo, para el profesional que ya usa otro
// sistema, una planilla o documentos de Word. Los archivos se suben desde
// Configuración > Mis datos (ver src/components/importacion-settings.tsx y el
// Acuerdo de tratamiento de datos, punto 3), nunca por mail ni WhatsApp.
// Destino de los links "#migracion" de Planes y del FAQ. El verde
// (brand-accent) la separa del índigo de los CTA de prueba.

const STEPS = [
  {
    title: "Subís tus archivos desde la app",
    body: "Te registrás y los subís en Configuración > Mis datos. Nada por mail ni WhatsApp, y se borran solos al terminar.",
  },
  {
    title: "Ordenamos y cargamos tus datos",
    body: "Pasamos los datos de cada paciente y, siempre que el formato lo permita, también sus evoluciones.",
  },
  {
    title: "Entrás y están todos",
    body: "Te avisamos cuando terminamos, para que revises y confirmes antes del próximo turno.",
  },
] as const;

// Lo que aceptamos. PDF escaneados y papel quedan afuera a propósito.
const SOURCES = [
  { icon: Database, label: "Export de otro sistema", tint: "text-primary bg-primary/10" },
  { icon: FileSpreadsheet, label: "Excel o CSV", tint: "text-[#16A34A] bg-[#16A34A]/10" },
  { icon: FileText, label: "Documentos de Word", tint: "text-[#2563EB] bg-[#2563EB]/10" },
] as const;

const PACIENTES = [
  { nombre: "González, María", evoluciones: 12 },
  { nombre: "Ramírez, Carlos", evoluciones: 4 },
  { nombre: "Fernández, Laura", evoluciones: 27 },
  { nombre: "Sosa, Mateo", evoluciones: 9 },
] as const;

const list: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

// Las filas de pacientes entran después de los archivos: se lee como que
// los archivos "se convierten" en la lista.
const rows: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.14, delayChildren: 0.6 } },
};

// El contador cierra la secuencia, después de la última fila.
const badge: Variants = {
  hidden: { opacity: 0, y: 6 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT, delay: 1.3 } },
};

export function Migracion() {
  return (
    <section id="migracion" className="scroll-mt-20 border-t border-border/60 py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
        <div className="flex flex-col gap-8">
          <SectionHeading
            align="left"
            kicker="Migración sin cargo"
            title="Cambiate de sistema sin volver a cargar un solo paciente"
            description="Si hoy usás otro software, una planilla o documentos de Word, nosotros pasamos tus pacientes a Semio360. Sin costo y sin tope de pacientes."
          />

          <motion.ol
            initial="hidden"
            whileInView="shown"
            viewport={IN_VIEW}
            variants={list}
            className="flex flex-col gap-5"
          >
            {STEPS.map((step, i) => (
              <motion.li key={step.title} variants={item} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary tabular-nums">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="font-heading text-[15px] font-bold">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>

          <div className="flex flex-col items-start gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/signup?plan=PREMIUM" rel="nofollow" />}>
              Empezar y migrar mis pacientes
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Info className="size-3.5 shrink-0" />
              No trabajamos con PDF escaneados ni historias en papel.
            </p>
          </div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="shown"
          viewport={IN_VIEW}
          className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center"
        >
          <motion.ul variants={list} className="flex flex-col gap-2.5 sm:w-52 sm:shrink-0">
            {SOURCES.map(({ icon: Icon, label, tint }) => (
              <motion.li
                key={label}
                variants={item}
                className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-[13px] font-semibold"
              >
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${tint}`}>
                  <Icon className="size-4" />
                </span>
                {label}
              </motion.li>
            ))}
          </motion.ul>

          <ArrowRight aria-hidden className="mx-auto size-6 shrink-0 rotate-90 text-primary sm:rotate-0" />

          <AppWindow title="Pacientes" className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 p-4">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                <span>Paciente</span>
                <span>Evoluciones</span>
              </div>
              <motion.ul variants={rows} className="flex flex-col gap-1">
                {PACIENTES.map((p) => (
                  <motion.li
                    key={p.nombre}
                    variants={item}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-[13.5px] odd:bg-muted/50"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{p.nombre}</span>
                    <span className="text-muted-foreground tabular-nums">{p.evoluciones}</span>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.p
                variants={badge}
                className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-brand-accent/10 px-2.5 py-1 text-[12px] font-bold text-brand-accent"
              >
                <span className="size-1.5 rounded-full bg-brand-accent" />
                847 pacientes importados
              </motion.p>
            </div>
          </AppWindow>
        </motion.div>
      </div>
    </section>
  );
}
