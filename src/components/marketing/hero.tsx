"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroWindow } from "./hero-window";

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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand-accent" />
            60 días de prueba gratis, sin tarjeta
          </span>
          <h1 className="max-w-xl font-heading text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.05]">
            Tu consultorio.
            <br />
            Más simple. <span className="text-primary">Más conectado.</span>
          </h1>
          <p className="max-w-md text-lg text-muted-foreground text-balance">
            Gestioná turnos, pacientes e historias clínicas desde un solo lugar.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
              Probar Semio360
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="#producto" />}
            >
              <PlayCircle className="size-4" data-icon="inline-start" />
              Ver cómo funciona
            </Button>
          </div>
        </motion.div>

        <div className="flex justify-center lg:justify-end">
          <HeroWindow />
        </div>
      </div>
    </section>
  );
}
