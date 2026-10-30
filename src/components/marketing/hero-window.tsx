"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useReducedMotion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "motion/react";
import { Mic } from "lucide-react";
import { AppWindow } from "./app-window";
import { MockSidebar } from "./mock-sidebar";
import { AppointmentCard } from "./appointment-card";
import { NotificationToast } from "./notification-toast";
import { PatientProfileCard } from "./patient-profile-card";
import { DEMO_TURNOS } from "./demo-data";
import { EASE_OUT, SPRING_SOFT } from "./motion-tokens";

type Step = "sidebar" | "turnos" | "cursor" | "confirmed" | "notify" | "patient" | "dictado";

// Guion del hero: la app "trabaja sola" -- se carga la agenda, un cursor
// confirma el primer turno, se abre la ficha de esa paciente y se dicta la
// evolución. Cada delay es relativo al paso anterior.
const SEQUENCE: { step: Step; delay: number }[] = [
  { step: "sidebar", delay: 300 },
  { step: "turnos", delay: 500 },
  { step: "cursor", delay: 700 },
  { step: "confirmed", delay: 1000 },
  { step: "notify", delay: 150 },
  { step: "patient", delay: 900 },
  { step: "dictado", delay: 700 },
];

const DICTADO = "Cefalea de 3 días, sin fiebre. TA 130/85. Control en 15 días.";

// Inclinación máxima (grados) al seguir el puntero -- apenas perceptible a
// propósito: da profundidad sin que la ventana parezca una tarjeta flotando.
const TILT = 3;

export function HeroWindow() {
  const reduce = useReducedMotion();
  const [reached, setReached] = useState<Set<Step>>(new Set());

  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });

  useEffect(() => {
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deriva el estado final a partir de la preferencia de reduced-motion
      setReached(new Set(SEQUENCE.map((s) => s.step).filter((s) => s !== "cursor")));
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let acc = 0;
    for (const { step, delay } of SEQUENCE) {
      acc += delay;
      timers.push(
        setTimeout(() => setReached((prev) => new Set(prev).add(step)), acc)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [reduce]);

  const has = (s: Step) => reached.has(s);
  const turnos = DEMO_TURNOS.slice(0, 3).map((t, i) =>
    i === 0 && !has("confirmed") ? { ...t, estado: "pendiente" as const } : t
  );

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    rotateY.set(((e.clientX - r.left) / r.width - 0.5) * TILT * 2);
    rotateX.set(-((e.clientY - r.top) / r.height - 0.5) * TILT * 2);
  }

  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE_OUT }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative w-full max-w-2xl"
    >
      <motion.div style={{ rotateX, rotateY, transformPerspective: 1200 }}>
        <AppWindow className="w-full">
          <div className="relative flex h-[340px] sm:h-[380px]">
            <AnimatePresence>
              {has("sidebar") && (
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                >
                  <MockSidebar className="hidden h-full sm:flex" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative flex min-w-0 flex-1 flex-col">
              <NotificationToast show={has("notify")} text="Turno confirmado" />
              <div className="relative flex flex-1 flex-col gap-2 overflow-hidden p-3 sm:p-4">
                <p className="px-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Hoy · Lunes
                </p>
                {has("turnos") &&
                  turnos.map((t, i) => <AppointmentCard key={t.hora} turno={t} index={i} />)}
                <DemoCursor show={has("cursor") && !has("patient")} pressed={has("confirmed")} />
              </div>
              <AnimatePresence>
                {has("patient") && (
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SPRING_SOFT}
                    className="border-t border-border/60 bg-muted/20"
                  >
                    <PatientProfileCard compact />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </AppWindow>
      </motion.div>

      <AnimatePresence>
        {has("dictado") && <DictationCard instant={!!reduce} />}
      </AnimatePresence>
    </motion.div>
  );
}

// Puntero que viaja hasta el ícono de estado del primer turno y "hace click".
// Posición fija respecto del contenedor de turnos (primera card arriba a la
// derecha): los mockups tienen alto fijo, así que no hace falta medir.
function DemoCursor({ show, pressed }: { show: boolean; pressed: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, x: -140, y: 160 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: pressed ? [1, 0.8, 1] : 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          transition={{ duration: 0.9, ease: EASE_OUT, scale: { duration: 0.25 } }}
          className="pointer-events-none absolute top-[62px] right-[18px] z-20 size-5 sm:top-[66px] sm:right-[22px]"
        >
          <svg viewBox="0 0 24 24" className="size-full drop-shadow-[0_2px_3px_rgba(0,0,0,.3)]">
            <path
              d="M4 2l16 9-7 2-3 7z"
              fill="white"
              stroke="#1b2233"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Tarjeta flotante de dictado: onda de audio + texto que se va escribiendo.
function DictationCard({ instant }: { instant: boolean }) {
  const [typed, setTyped] = useState(instant ? DICTADO.length : 0);

  useEffect(() => {
    if (instant) return;
    const id = setInterval(() => {
      setTyped((n) => {
        if (n >= DICTADO.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 32);
    return () => clearInterval(id);
  }, [instant]);

  const done = typed >= DICTADO.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING_SOFT}
      className="absolute -bottom-6 left-3 z-10 flex w-[min(17rem,calc(100%-1.5rem))] flex-col gap-2 rounded-xl border border-border/60 bg-card/95 p-3 shadow-xl shadow-primary/10 backdrop-blur sm:-left-8"
    >
      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <span className="flex size-5 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent">
          <Mic className="size-3" />
        </span>
        {done ? "Evolución transcripta" : "Dictando evolución…"}
        <span className="ml-auto flex h-3.5 items-center gap-[2px]" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <motion.span
              key={i}
              className="h-full w-[2px] origin-center rounded-full bg-brand-accent"
              initial={{ scaleY: 0.3 }}
              animate={done || instant ? { scaleY: 0.3 } : { scaleY: [0.3, 1, 0.3] }}
              transition={
                done || instant
                  ? { duration: 0.3 }
                  : { duration: 0.9, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }
              }
            />
          ))}
        </span>
      </div>
      <p className="min-h-[2.6em] text-xs leading-relaxed">
        {DICTADO.slice(0, typed)}
        {!done && <span className="ml-px inline-block h-3 w-px animate-pulse bg-primary align-middle" />}
      </p>
    </motion.div>
  );
}
