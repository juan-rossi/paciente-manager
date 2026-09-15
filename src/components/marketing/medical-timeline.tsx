"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { DEMO_TIMELINE } from "./demo-data";

// La línea vertical se dibuja en función del scroll del propio contenedor
// (no de la página completa), para poder incrustarla dentro del mockup.
export function MedicalTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "end 60%"] });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="relative flex flex-col gap-5 p-4 pl-10">
      <div className="absolute top-1 bottom-1 left-6 w-px bg-border/70" />
      <motion.div
        style={{ height }}
        className="absolute top-1 left-6 w-px bg-primary"
      />
      {DEMO_TIMELINE.map((entry, i) => (
        <motion.div
          key={entry.fecha}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="relative"
        >
          <span className="absolute top-1 -left-[21px] size-2.5 rounded-full border-2 border-primary bg-card" />
          <p className="text-[11px] font-semibold text-primary">{entry.fecha}</p>
          <p className="text-[13px] font-medium">{entry.titulo}</p>
          <p className="text-xs text-muted-foreground">{entry.texto}</p>
        </motion.div>
      ))}
    </div>
  );
}
