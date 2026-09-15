"use client";

import { motion } from "motion/react";
import {
  CalendarClock,
  ClipboardSignature,
  History,
  Mic,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "./section-heading";

type Feature = {
  icon: LucideIcon;
  title: string;
  text: string;
  detail: string;
};

// Funcionalidades reales del producto (no una grilla genérica de features
// inventadas) -- cada una existe hoy en Semio360.
const FEATURES: Feature[] = [
  {
    icon: History,
    title: "Historia clínica completa",
    text: "Datos personales, antecedentes, examen físico, diagnóstico y evolución, todo en la ficha del paciente.",
    detail: "Ficha única por paciente",
  },
  {
    icon: Mic,
    title: "Dictado con transcripción local",
    text: "Dictás la evolución y se transcribe sola, con un transcriptor que corre en tu propia computadora.",
    detail: "El audio nunca sale de tu equipo",
  },
  {
    icon: ClipboardSignature,
    title: "Consentimiento informado",
    text: "Registrás consentimientos verbales o escritos, con impresión lista para firmar, según la Ley 26.529.",
    detail: "Otorgado, rechazado o revocado",
  },
  {
    icon: CalendarClock,
    title: "Turnos y recordatorios",
    text: "Agenda configurable por horarios de atención, con recordatorios de turno listos para enviar por WhatsApp.",
    detail: "Menos ausencias, menos llamados",
  },
  {
    icon: Users,
    title: "Roles por usuario",
    text: "Tu secretaria gestiona turnos sin acceder a la información clínica sensible de tus pacientes.",
    detail: "Médico y secretaria, separados",
  },
  {
    icon: ScrollText,
    title: "Auditoría de cada cambio",
    text: "Todo alta, edición o eliminación queda registrada: quién, qué y cuándo, conservando el valor anterior.",
    detail: "Trazabilidad conforme a ley",
  },
];

export function Features() {
  return (
    <section id="funcionalidades" className="border-t border-border/60 bg-muted/20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          kicker="Funcionalidades"
          title="Pensado para el consultorio real"
          description="No es un CRM genérico con nombre médico: cada función resuelve un problema puntual del día a día de un consultorio."
          className="mb-14"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08, ease: "easeOut" }}
              className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <f.icon className="size-5" />
              </span>
              <div>
                <h3 className="font-heading text-lg font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
              </div>
              <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {f.detail}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
