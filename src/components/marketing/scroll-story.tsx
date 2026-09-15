"use client";

import { useEffect, useRef, useState } from "react";
import { AppWindow } from "./app-window";
import { MockSidebar } from "./mock-sidebar";
import { AppointmentCard } from "./appointment-card";
import { PatientProfileCard } from "./patient-profile-card";
import { DEMO_TIMELINE, DEMO_TURNOS } from "./demo-data";

const SCENES = [
  {
    kicker: "01",
    title: "Tu día comienza acá.",
    text: "Abrís Semio360 y ves la agenda del día, sin planillas ni cuadernos sueltos.",
  },
  {
    kicker: "02",
    title: "Todo sobre tu paciente, a un clic.",
    text: "Un turno se transforma directo en la ficha del paciente: datos, antecedentes y próxima cita.",
  },
  {
    kicker: "03",
    title: "Una historia clínica que realmente ayuda.",
    text: "Cada consulta queda registrada en una línea de tiempo clara, lista para la próxima visita.",
  },
] as const;

// Storytelling "agenda -> paciente -> historia clínica" ligado al scroll con
// GSAP ScrollTrigger (pin + scrub) -- una sola interfaz que se transforma,
// no tres capturas sueltas. Con prefers-reduced-motion, se muestran los 3
// estados apilados y estáticos, sin pin ni scrub.
export function ScrollStory() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scene0Ref = useRef<HTMLDivElement>(null);
  const scene1Ref = useRef<HTMLDivElement>(null);
  const scene2Ref = useRef<HTMLDivElement>(null);
  const text0Ref = useRef<HTMLDivElement>(null);
  const text1Ref = useRef<HTMLDivElement>(null);
  const text2Ref = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee una API del navegador una sola vez al montar
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reducedMotion !== false) return;
    if (!sectionRef.current) return;

    let ctx: ReturnType<typeof import("gsap").gsap.context> | undefined;
    let scrollTriggerInstance: { kill: () => void } | undefined;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const scenes = [scene0Ref.current, scene1Ref.current, scene2Ref.current].filter(
          Boolean
        ) as HTMLDivElement[];
        const texts = [text0Ref.current, text1Ref.current, text2Ref.current].filter(
          Boolean
        ) as HTMLDivElement[];
        gsap.set(scenes.slice(1), { opacity: 0, y: 12 });
        gsap.set(texts.slice(1), { opacity: 0, y: 8 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "+=200%",
            scrub: 0.6,
            pin: true,
            anticipatePin: 1,
          },
        });
        scrollTriggerInstance = tl.scrollTrigger ?? undefined;

        // El mockup se puede cruzar en fade (se ve bien superpuesto un
        // instante), pero los títulos NO: se swapean en secuencia estricta
        // (el saliente llega a opacity 0 antes de que el entrante arranque)
        // para que nunca se lean dos títulos superpuestos en un scrub lento.
        tl.to({}, { duration: 0.15 })
          .to(scenes[0], { opacity: 0, y: -12, duration: 0.15 })
          .to(scenes[1], { opacity: 1, y: 0, duration: 0.15 }, "<")
          .to(texts[0], { opacity: 0, y: -8, duration: 0.06 }, "<")
          .to(texts[1], { opacity: 1, y: 0, duration: 0.06 })
          .to({}, { duration: 0.35 })
          .to(scenes[1], { opacity: 0, y: -12, duration: 0.15 })
          .to(scenes[2], { opacity: 1, y: 0, duration: 0.15 }, "<")
          .to(texts[1], { opacity: 0, y: -8, duration: 0.06 }, "<")
          .to(texts[2], { opacity: 1, y: 0, duration: 0.06 })
          .fromTo(lineRef.current, { height: "0%" }, { height: "100%", duration: 0.35, ease: "none" })
          .to({}, { duration: 0.1 });
      }, sectionRef);
    })();

    return () => {
      ctx?.revert();
      scrollTriggerInstance?.kill();
    };
  }, [reducedMotion]);

  if (reducedMotion === null) return <div ref={sectionRef} />;

  if (reducedMotion) {
    return (
      <section className="border-t border-border/60 py-20 sm:py-28">
        <div className="mx-auto flex max-w-5xl flex-col gap-20 px-4">
          {SCENES.map((scene, i) => (
            <div key={scene.title} className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-bold text-primary">{scene.kicker}</p>
                <h3 className="mt-2 font-heading text-2xl font-extrabold text-balance sm:text-3xl">
                  {scene.title}
                </h3>
                <p className="mt-3 text-muted-foreground">{scene.text}</p>
              </div>
              <StoryWindow sceneIndex={i} lineHeight="100%" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative border-t border-border/60">
      <div className="flex h-screen items-center overflow-hidden py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="relative h-32">
            <div ref={text0Ref} className="absolute inset-0">
              <StoryText scene={SCENES[0]} />
            </div>
            <div ref={text1Ref} className="absolute inset-0">
              <StoryText scene={SCENES[1]} />
            </div>
            <div ref={text2Ref} className="absolute inset-0">
              <StoryText scene={SCENES[2]} />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div ref={scene0Ref} className="relative">
              <StoryWindow sceneIndex={0} />
            </div>
            <div ref={scene1Ref} className="absolute inset-0">
              <StoryWindow sceneIndex={1} />
            </div>
            <div ref={scene2Ref} className="absolute inset-0">
              <StoryWindow sceneIndex={2} lineRef={lineRef} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoryText({ scene }: { scene: (typeof SCENES)[number] }) {
  return (
    <>
      <p className="text-sm font-bold text-primary">{scene.kicker} / 03</p>
      <h3 className="mt-2 font-heading text-3xl font-extrabold text-balance sm:text-4xl">
        {scene.title}
      </h3>
      <p className="mt-3 max-w-sm text-muted-foreground">{scene.text}</p>
    </>
  );
}

function StoryWindow({
  sceneIndex,
  lineRef,
  lineHeight,
}: {
  sceneIndex: number;
  lineRef?: React.RefObject<HTMLDivElement | null>;
  lineHeight?: string;
}) {
  return (
    <AppWindow>
      <div className="flex h-[360px]">
        <MockSidebar className="hidden h-full sm:flex" />
        <div className="min-w-0 flex-1 overflow-hidden">
          {sceneIndex === 0 && (
            <div className="flex flex-col gap-2 p-4">
              <p className="px-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Hoy · Lunes
              </p>
              {DEMO_TURNOS.slice(0, 3).map((t, i) => (
                <AppointmentCard key={t.hora} turno={t} index={i} />
              ))}
            </div>
          )}
          {sceneIndex === 1 && <PatientProfileCard />}
          {sceneIndex === 2 && (
            <div className="relative h-full overflow-hidden">
              <div className="absolute top-5 bottom-5 left-8 w-px bg-border/70" />
              <div
                ref={lineRef}
                style={{ height: lineHeight }}
                className="absolute top-5 left-8 w-px bg-primary"
              />
              <div className="flex h-full flex-col justify-center gap-4 p-4 pl-12">
                {DEMO_TIMELINE.map((entry) => (
                  <div key={entry.fecha} className="relative">
                    <span className="absolute top-1 -left-[21px] size-2.5 rounded-full border-2 border-primary bg-card" />
                    <p className="text-[11px] font-semibold text-primary">{entry.fecha}</p>
                    <p className="text-[13px] font-medium">{entry.titulo}</p>
                    <p className="text-xs text-muted-foreground">{entry.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppWindow>
  );
}
