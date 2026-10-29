"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { EASE_OUT } from "./motion-tokens";
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

// Storytelling "agenda -> paciente -> historia clínica" ligado al scroll:
// una sola interfaz que se transforma, no tres capturas sueltas. La sección
// mide 300vh y el contenido queda `sticky`; el progreso de scroll (motion
// useScroll, que usa ScrollTimeline nativo cuando el navegador lo soporta)
// maneja los cruces. Antes era un pin de GSAP, que reordenaba el DOM por su
// cuenta y chocaba con React al desmontar. Con prefers-reduced-motion, se
// muestran los 3 estados apilados y estáticos.
export function ScrollStory() {
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee una API del navegador una sola vez al montar
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  if (reducedMotion === null) return <div className="h-[300vh]" />;

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
              <StoryWindow sceneIndex={i} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return <AnimatedStory />;
}

// Puntos del progreso (0..1) de la sección donde cambia la escena. El mockup
// se cruza en fade ligado al scroll (se ve bien superpuesto un instante),
// pero los títulos NO van ligados al scroll: el scroll solo elige la escena
// activa y el texto cambia en secuencia (AnimatePresence mode="wait"), así
// que nunca se leen dos títulos superpuestos, scrollees como scrollees.
const SWAP_1 = 0.18;
const SWAP_2 = 0.52;

const sceneAt = (v: number) => (v < SWAP_1 + 0.06 ? 0 : v < SWAP_2 + 0.06 ? 1 : 2);

function AnimatedStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  // Entrada: desde que la sección asoma abajo hasta que toca el top.
  const { scrollYProgress: enter } = useScroll({ target: sectionRef, offset: ["start end", "start start"] });

  const tiltX = useTransform(enter, [0, 1], [22, 0]);
  const tiltScale = useTransform(enter, [0, 1], [0.9, 1]);

  const scene0 = useCross(p, null, SWAP_1, 0.12);
  const scene1 = useCross(p, SWAP_1, SWAP_2, 0.12);
  const scene2 = useCross(p, SWAP_2, null, 0.12);
  const [active, setActive] = useState(0);
  useMotionValueEvent(p, "change", (v) => setActive(sceneAt(v)));
  const lineHeight = useTransform(p, [SWAP_2 + 0.12, 0.92], ["0%", "100%"]);

  return (
    <section ref={sectionRef} className="relative h-[300vh] border-t border-border/60">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="relative h-32">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.18, ease: "easeIn" } }}
                className="absolute inset-0"
              >
                <StoryText scene={SCENES[active]} />
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.div
            style={{ rotateX: tiltX, scale: tiltScale, transformPerspective: 1400, transformOrigin: "50% 100%" }}
            className="relative mx-auto w-full max-w-md"
          >
            <motion.div style={scene0} className="relative">
              <StoryWindow sceneIndex={0} />
            </motion.div>
            <motion.div style={scene1} className="absolute inset-0">
              <StoryWindow sceneIndex={1} />
            </motion.div>
            <motion.div style={scene2} className="absolute inset-0">
              <StoryWindow sceneIndex={2} lineHeight={lineHeight} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Opacidad + desplazamiento de una escena visible entre `from` y `to`
// (null = visible desde el inicio / hasta el final), con fundidos de `fade`.
function useCross(
  p: MotionValue<number>,
  from: number | null,
  to: number | null,
  fade: number,
  shift = 12
) {
  const input = [
    ...(from === null ? [0] : [from, from + fade]),
    ...(to === null ? [1] : [to, to + fade]),
  ];
  const opacity = useTransform(p, input, [
    ...(from === null ? [1] : [0, 1]),
    ...(to === null ? [1] : [1, 0]),
  ]);
  const y = useTransform(p, input, [
    ...(from === null ? [0] : [shift, 0]),
    ...(to === null ? [0] : [0, -shift]),
  ]);
  return { opacity, y };
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
  lineHeight = "100%",
}: {
  sceneIndex: number;
  lineHeight?: string | MotionValue<string>;
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
              <motion.div
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
