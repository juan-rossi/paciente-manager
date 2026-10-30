"use client";

import { motion } from "motion/react";
import { DatabaseBackup, Lock, ScrollText, ShieldCheck, UserCog } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { EASE_OUT, IN_VIEW } from "./motion-tokens";

// Trazo tipo electrocardiograma (dos latidos) que se dibuja una sola vez.
const ECG_PATH = "M0 20H52l5-4 5 4h8l4 12 6-30 5 26 4-8h22l7-6 7 6H160l5-4 5 4h8l4 12 6-30 5 26 4-8h38";

// Solo afirmaciones reales: las mismas 3 que ya existían en la sección de
// compliance del Home actual (confidencialidad, acceso controlado, historia
// clínica digital conforme a Ley 26.529), más la auditoría de cambios y los
// backups automáticos -- ambos verificables en el propio repositorio
// (AuditLog model, scripts/backup-db.ts), no marketing inventado.
const LAYERS = [
  {
    icon: ShieldCheck,
    title: "Confidencialidad por diseño",
    text: "Cada médico ve únicamente los datos de sus propios pacientes. Los asistentes no acceden a información clínica sensible.",
  },
  {
    icon: Lock,
    title: "Acceso controlado",
    text: "Login con contraseña o Google, con roles diferenciados por usuario y datos alojados en la nube con acceso restringido.",
  },
  {
    icon: ScrollText,
    title: "Auditoría de cada cambio",
    text: "Toda alta, edición o eliminación queda registrada -- quién, qué y cuándo -- conservando el valor anterior de lo modificado.",
  },
  {
    icon: DatabaseBackup,
    title: "Backups automáticos",
    text: "La base de datos se respalda de forma automática antes de cada actualización del sistema.",
  },
] as const;

export function TrustSecurity() {
  return (
    <section id="confianza" className="border-t border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4">
        <SectionHeading
          kicker="Confianza y compliance"
          title="La información de tus pacientes merece estar protegida."
          description="Cumplimos con la Ley 26.529 de Derechos del Paciente, Historia Clínica y Consentimiento Informado -- lo tomamos en serio desde el diseño del producto."
          className="mb-14"
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={IN_VIEW}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            className="mx-auto flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <UserCog className="size-7" />
            </span>
            <h3 className="font-heading text-lg font-bold">Historia clínica digital</h3>
            <p className="text-sm text-muted-foreground">
              Toda la evolución del paciente, registrada de forma cronológica y centralizada, tal
              como exige la ley.
            </p>
            <svg viewBox="0 0 240 36" className="mt-1 h-9 w-full overflow-visible" aria-hidden>
              <path d="M0 20H240" className="stroke-primary/15" strokeWidth={1} fill="none" />
              <motion.path
                d={ECG_PATH}
                fill="none"
                className="stroke-brand-accent"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={IN_VIEW}
                transition={{ duration: 1.8, ease: EASE_OUT, delay: 0.3 }}
              />
            </svg>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {LAYERS.map((layer, i) => (
              <motion.div
                key={layer.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={IN_VIEW}
                transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 + i * 0.08 }}
                className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-5"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <layer.icon className="size-4.5" />
                </span>
                <h4 className="text-sm font-semibold">{layer.title}</h4>
                <p className="text-xs text-muted-foreground">{layer.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <a
            href="mailto:contacto@semio360.com?subject=Preguntas sobre seguridad y compliance"
            className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1.5px] bg-left-bottom bg-no-repeat pb-0.5 text-sm font-semibold text-primary transition-[background-size] duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:bg-[length:100%_1.5px] focus-visible:bg-[length:100%_1.5px]"
          >
            Conocer más sobre seguridad y compliance →
          </a>
        </div>
      </div>
    </section>
  );
}
