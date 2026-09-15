"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { AppWindow } from "./app-window";
import { MockSidebar } from "./mock-sidebar";
import { AppointmentCard } from "./appointment-card";
import { NotificationToast } from "./notification-toast";
import { PatientProfileCard } from "./patient-profile-card";
import { DEMO_TURNOS } from "./demo-data";

type Step = "sidebar" | "turnos" | "notify" | "confirmed" | "patient";

const SEQUENCE: { step: Step; delay: number }[] = [
  { step: "sidebar", delay: 300 },
  { step: "turnos", delay: 500 },
  { step: "notify", delay: 900 },
  { step: "confirmed", delay: 1400 },
  { step: "patient", delay: 900 },
];

export function HeroWindow() {
  const reduce = useReducedMotion();
  const [reached, setReached] = useState<Set<Step>>(new Set());

  useEffect(() => {
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deriva el estado final a partir de la preferencia de reduced-motion
      setReached(new Set(SEQUENCE.map((s) => s.step)));
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <AppWindow className="w-full max-w-2xl">
        <div className="relative flex h-[340px] sm:h-[380px]">
          <AnimatePresence>
            {has("sidebar") && (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <MockSidebar className="hidden h-full sm:flex" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex min-w-0 flex-1 flex-col">
            <NotificationToast show={has("notify")} text="Turno confirmado" />
            <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3 sm:p-4">
              <p className="px-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Hoy · Lunes
              </p>
              {has("turnos") &&
                turnos.map((t, i) => <AppointmentCard key={t.hora} turno={t} index={i} />)}
            </div>
            <AnimatePresence>
              {has("patient") && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
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
  );
}
