"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  CalendarDays,
  ClipboardSignature,
  FileText,
  MessageCircle,
  NotebookPen,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Semio360Mark } from "@/components/brand/logo";

type Module = { icon: LucideIcon; label: string; x: number; y: number };

// Mismos 6 módulos reales del diagrama de órbita -- acá "convergen" hacia el
// centro con el scroll (GSAP ScrollTrigger), representando
// "herramientas dispersas -> Semio360".
const MODULES: Module[] = [
  { icon: CalendarDays, label: "Turnos", x: -220, y: -120 },
  { icon: Users, label: "Pacientes", x: 220, y: -110 },
  { icon: NotebookPen, label: "Historia clínica", x: -260, y: 90 },
  { icon: FileText, label: "Documentos", x: 240, y: 100 },
  { icon: ClipboardSignature, label: "Consentimientos", x: -120, y: 170 },
  { icon: MessageCircle, label: "Recordatorios", x: 130, y: -180 },
];

export function FinalCTA() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const moduleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const centerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee una API del navegador una sola vez al montar
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reducedMotion !== false || !sectionRef.current) return;

    let ctx: ReturnType<typeof import("gsap").gsap.context> | undefined;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        gsap.set(headlineRef.current, { opacity: 0, y: 16 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "+=120%",
            scrub: 0.6,
            pin: true,
          },
        });

        tl.to(moduleRefs.current, {
          x: 0,
          y: 0,
          scale: 0.4,
          opacity: 0,
          duration: 0.7,
          stagger: 0.04,
          ease: "power2.in",
        })
          .to(centerRef.current, { opacity: 0, scale: 0.6, duration: 0.2 })
          .to(headlineRef.current, { opacity: 1, y: 0, duration: 0.3 }, "<");
      }, sectionRef);
    })();

    return () => ctx?.revert();
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <section className="border-t border-border/60 py-20 sm:py-28">
        <FinalHeadline visible />
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative overflow-hidden border-t border-border/60">
      <div className="flex h-screen items-center justify-center">
        <div className="relative flex size-full max-w-3xl items-center justify-center">
          {MODULES.map((m, i) => (
            <div
              key={m.label}
              ref={(el) => {
                moduleRefs.current[i] = el;
              }}
              className="absolute flex flex-col items-center gap-1.5"
              style={{ transform: `translate(${m.x}px, ${m.y}px)` }}
            >
              <span className="flex size-12 items-center justify-center rounded-xl border border-border/60 bg-card text-primary shadow-md">
                <m.icon className="size-5" />
              </span>
              <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                {m.label}
              </span>
            </div>
          ))}

          <div ref={centerRef} className="absolute flex flex-col items-center gap-2">
            <Semio360Mark className="size-16 drop-shadow-xl" />
          </div>

          <div ref={headlineRef} className="absolute px-4">
            <FinalHeadline visible />
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalHeadline({ visible }: { visible: boolean }) {
  return (
    <motion.div
      initial={visible ? { opacity: 0, y: 16 } : false}
      whileInView={visible ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <h2 className="font-heading text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
        Todo tu consultorio.
        <br />
        Una sola plataforma.
      </h2>
      <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
        Empezar con Semio360
      </Button>
    </motion.div>
  );
}
