"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, NotebookPen } from "lucide-react";
import { AppWindow } from "./app-window";
import { MockSidebar } from "./mock-sidebar";
import { AppointmentCard } from "./appointment-card";
import { PatientProfileCard } from "./patient-profile-card";
import { MedicalTimeline } from "./medical-timeline";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./section-heading";
import { DEMO_TURNOS } from "./demo-data";

type View = "agenda" | "perfil" | "historia";

export function InteractiveDemo() {
  const [view, setView] = useState<View>("agenda");

  return (
    <section className="border-t border-border/60 bg-muted/20 py-20 sm:py-28">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-10 px-4">
        <SectionHeading
          kicker="Probalo vos mismo"
          title="Conocé Semio360 en 30 segundos"
          description="Hacé clic en un turno para ver cómo se navega, sin necesidad de crear una cuenta."
        />

        <AppWindow className="w-full">
          <div className="flex h-[420px] sm:h-[440px]">
            <MockSidebar className="hidden h-full sm:flex" />
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {view === "agenda" && (
                  <motion.div
                    key="agenda"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.3 }}
                    className="flex h-full flex-col gap-2 p-4"
                  >
                    <p className="px-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Hoy · Lunes — hacé clic en un turno
                    </p>
                    {DEMO_TURNOS.filter((t) => t.estado !== "libre").map((t, i) => (
                      <AppointmentCard
                        key={t.hora}
                        turno={t}
                        index={i}
                        onClick={() => setView("perfil")}
                      />
                    ))}
                  </motion.div>
                )}

                {view === "perfil" && (
                  <motion.div
                    key="perfil"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.3 }}
                    className="flex h-full flex-col"
                  >
                    <DemoNav onBack={() => setView("agenda")} label="María González" />
                    <div className="flex-1 overflow-auto">
                      <PatientProfileCard />
                    </div>
                    <div className="border-t border-border/60 p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setView("historia")}
                      >
                        <NotebookPen className="size-3.5" data-icon="inline-start" />
                        Ver historia clínica
                      </Button>
                    </div>
                  </motion.div>
                )}

                {view === "historia" && (
                  <motion.div
                    key="historia"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.3 }}
                    className="flex h-full flex-col"
                  >
                    <DemoNav onBack={() => setView("perfil")} label="Historia clínica" />
                    <div className="flex-1 overflow-auto">
                      <MedicalTimeline />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </AppWindow>
      </div>
    </section>
  );
}

function DemoNav({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
      <button
        type="button"
        onClick={onBack}
        className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Volver"
      >
        <ArrowLeft className="size-3.5" />
      </button>
      <p className="text-xs font-semibold">{label}</p>
    </div>
  );
}
