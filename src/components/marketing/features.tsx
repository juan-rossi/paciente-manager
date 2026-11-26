"use client";

import { motion } from "motion/react";
import {
  CalendarClock,
  Check,
  ClipboardSignature,
  History,
  Mic,
  ScrollText,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "./section-heading";
import { IN_VIEW, SPRING_SOFT } from "./motion-tokens";

function trackPointer(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
}

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
    title: "Dictado con transcripción automática",
    text: "Dictás la evolución desde el navegador y se transcribe sola, con un resumen listo para revisar.",
    detail: "El audio no se guarda, solo el texto",
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
    text: "Tu asistente gestiona turnos sin acceder a la información clínica sensible de tus pacientes.",
    detail: "Profesional y asistente, separados",
  },
  {
    icon: ScrollText,
    title: "Auditoría de cada cambio",
    text: "Todo alta, edición o eliminación queda registrada: quién, qué y cuándo, conservando el valor anterior.",
    detail: "Trazabilidad conforme a ley",
  },
];

// Teleconsulta (Premium): solo con la plataforma prendida
// (TELECONSULTA_HABILITADA, lo pasa la página). Va como tarjeta ancha al
// final para no dejar una fila con una sola tarjeta.
const TELECONSULTA_PUNTOS = [
  "El paciente entra desde el link del recordatorio, sin descargar nada",
  "Pasás un turno presencial a videollamada sin cambiarle el horario",
  "Agenda propia de teleconsultas, con reserva online",
];

function TeleconsultaCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={IN_VIEW}
      transition={SPRING_SOFT}
      onPointerMove={trackPointer}
      className="group relative grid gap-6 overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-[border-color,box-shadow] duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:col-span-2 lg:col-span-3 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-10 lg:p-8"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(320px circle at var(--x, 50%) var(--y, 50%), color-mix(in oklch, var(--primary) 12%, transparent), transparent 70%)",
        }}
      />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 ease-[cubic-bezier(.34,1.32,.64,1)] group-hover:-translate-y-0.5 group-hover:scale-105">
            <Video className="size-5" />
          </span>
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
            Premium
          </span>
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold">Teleconsulta por videollamada</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Atendé a distancia desde la misma agenda donde ya tenés tus turnos, con acceso a la ficha del
            paciente durante la consulta.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          Consentimiento del paciente según Ley 27.553
        </span>
      </div>
      <ul className="relative flex flex-col gap-3">
        {TELECONSULTA_PUNTOS.map((punto) => (
          <li
            key={punto}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm"
          >
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            {punto}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function Features({ teleconsultaDisponible }: { teleconsultaDisponible: boolean }) {
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
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={IN_VIEW}
              transition={{ ...SPRING_SOFT, delay: (i % 3) * 0.08 }}
              onPointerMove={trackPointer}
              className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-[border-color,box-shadow] duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Halo que sigue al puntero (variables CSS, sin re-render). */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(260px circle at var(--x, 50%) var(--y, 50%), color-mix(in oklch, var(--primary) 12%, transparent), transparent 70%)",
                }}
              />
              <span className="relative flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 ease-[cubic-bezier(.34,1.32,.64,1)] group-hover:-translate-y-0.5 group-hover:scale-105">
                <f.icon className="size-5" />
              </span>
              <div className="relative">
                <h3 className="font-heading text-lg font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
              </div>
              <span className="relative mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {f.detail}
              </span>
            </motion.div>
          ))}
          {teleconsultaDisponible && <TeleconsultaCard />}
        </div>
      </div>
    </section>
  );
}
