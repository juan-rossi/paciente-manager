"use client";

import { Fragment } from "react";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRIAL_DIAS } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { HeroWindow } from "./hero-window";
import { EASE_OUT } from "./motion-tokens";

// Titular por líneas; `hl` = palabra en color de marca.
const HEADLINE: { w: string; hl?: boolean }[][] = [
  [{ w: "Tu" }, { w: "consultorio." }],
  [{ w: "Más" }, { w: "simple." }, { w: "Más", hl: true }, { w: "conectado.", hl: true }],
];

const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

// Entrada con desenfoque: cada palabra "enfoca" mientras sube, escalonada.
const blurIn: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(8px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE_OUT } },
};

// Hover con resorte (sube 2px) y presión al click, para los CTA del hero.
const CTA_MOTION =
  "transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(.34,1.32,.64,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]";

export function Hero() {
  return (
    // 57px = altura real del header sticky (ver SiteHeader) -- se resta acá
    // para que el hero ocupe exactamente el resto del viewport, sin que el
    // conjunto header+hero termine siendo más alto que una pantalla.
    <section className="relative flex min-h-[calc(100vh-57px)] flex-col justify-center overflow-hidden py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 50% at 50% 0%, color-mix(in oklch, var(--primary) 16%, transparent), transparent)",
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-8">
        <motion.div
          initial="hidden"
          animate="shown"
          variants={stagger}
          className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left"
        >
          <motion.span
            variants={blurIn}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-accent/60 motion-reduce:hidden" />
              <span className="relative size-1.5 rounded-full bg-brand-accent" />
            </span>
            Prueba gratis sin tarjeta: {TRIAL_DIAS.BASICA} días Básico, {TRIAL_DIAS.PREMIUM} Premium
          </motion.span>
          <motion.h1
            variants={stagger}
            aria-label="Tu consultorio. Más simple. Más conectado."
            className="max-w-xl font-heading text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.05]"
          >
            {HEADLINE.map((line, li) => (
              <span key={li} aria-hidden className="block">
                {line.map(({ w, hl }, wi) => (
                  <Fragment key={wi}>
                    <motion.span variants={blurIn} className={cn("inline-block", hl && "text-primary")}>
                      {w}
                    </motion.span>
                    {wi < line.length - 1 && " "}
                  </Fragment>
                ))}
              </span>
            ))}
          </motion.h1>
          <motion.p variants={blurIn} className="max-w-md text-lg text-muted-foreground text-balance">
            Gestioná turnos, pacientes e historias clínicas desde un solo lugar.
          </motion.p>
          <motion.div
            variants={blurIn}
            className="flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/signup?plan=PREMIUM" />}
              className={cn(CTA_MOTION, "hover:shadow-lg hover:shadow-primary/25")}
            >
              Probar Semio360
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover/button:translate-x-0.5"
                data-icon="inline-end"
              />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="#producto" />}
              className={CTA_MOTION}
            >
              <PlayCircle className="size-4" data-icon="inline-start" />
              Ver cómo funciona
            </Button>
          </motion.div>
        </motion.div>

        <div className="flex justify-center lg:justify-end">
          <HeroWindow />
        </div>
      </div>
    </section>
  );
}
