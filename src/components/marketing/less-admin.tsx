"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { CalendarPlus, CheckCircle2, FileCheck2, Mic, Stethoscope, UserCheck } from "lucide-react";
import { AppWindow } from "./app-window";
import { PatientProfileCard } from "./patient-profile-card";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: CalendarPlus, label: "Nuevo turno" },
  { icon: UserCheck, label: "Confirmación" },
  { icon: Stethoscope, label: "Paciente" },
  { icon: Mic, label: "Consulta" },
  { icon: FileCheck2, label: "Historia clínica" },
  { icon: CheckCircle2, label: "Finalización" },
] as const;

const STEP_MS = 2400;

export function LessAdmin() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <section className="border-t border-border/60 py-20 sm:py-28">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-12 px-4">
        <SectionHeading
          kicker="El flujo completo"
          title="Menos administración. Más tiempo para tus pacientes."
          description="Un turno nuevo recorre solo todo el camino: se confirma, abre la ficha del paciente y termina en la historia clínica."
        />

        <div className="w-full max-w-2xl">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            {STEPS.map((step, i) => (
              <div
                key={step.label}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  i === active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground"
                )}
              >
                <step.icon className="size-3" />
                {step.label}
              </div>
            ))}
          </div>

          <AppWindow>
            <div className="relative flex h-72 items-center justify-center overflow-hidden p-6 sm:h-80">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full max-w-sm"
                >
                  <StepScene index={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </AppWindow>
        </div>
      </div>
    </section>
  );
}

function StepScene({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarPlus className="size-6" />
          </span>
          <p className="text-sm font-semibold">María González — 09:00</p>
          <p className="text-xs text-muted-foreground">Se agenda un turno nuevo desde la agenda.</p>
        </div>
      );
    case 1:
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
            <UserCheck className="size-6" />
          </span>
          <p className="text-sm font-semibold">Turno confirmado</p>
          <p className="text-xs text-muted-foreground">Recordatorio listo para enviar por WhatsApp.</p>
        </div>
      );
    case 2:
      return (
        <div className="rounded-xl border border-border/60 bg-card">
          <PatientProfileCard compact />
        </div>
      );
    case 3:
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="relative flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mic className="size-6" />
            <span className="absolute inset-0 animate-ping rounded-xl bg-primary/20" />
          </span>
          <p className="text-sm font-semibold">Dictando la evolución…</p>
          <p className="text-xs text-muted-foreground">
            &ldquo;Paciente refiere buen estado general, sin síntomas nuevos.&rdquo;
          </p>
        </div>
      );
    case 4:
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileCheck2 className="size-6" />
          </span>
          <p className="text-sm font-semibold">Evolución guardada</p>
          <p className="text-xs text-muted-foreground">Queda en la historia clínica del paciente, ordenada por fecha.</p>
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
            <CheckCircle2 className="size-6" />
          </span>
          <p className="text-sm font-semibold">Consulta finalizada</p>
          <p className="text-xs text-muted-foreground">Todo quedó registrado, sin planillas ni pasos manuales.</p>
        </div>
      );
  }
}
