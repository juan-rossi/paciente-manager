"use client";

import { Fragment } from "react";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE_OUT, IN_VIEW } from "./motion-tokens";

type Props = {
  kicker: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
  // Página sin otro <h1> (p. ej. /directorio): el título pasa a ser el h1.
  as?: "h1" | "h2";
};

const container: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.045 } },
};

// Cada palabra sube desde atrás de una máscara (overflow-hidden), en vez de
// un fade del bloque entero: se lee como texto que "se escribe", no como un
// bloque que aparece.
const word: Variants = {
  hidden: { y: "110%" },
  shown: { y: "0%", transition: { duration: 0.7, ease: EASE_OUT } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT, delay: 0.25 } },
};

export function SectionHeading({ kicker, title, description, align = "center", className, as: Heading = "h2" }: Props) {
  const words = title.split(" ");

  return (
    <motion.div
      initial="hidden"
      whileInView="shown"
      viewport={IN_VIEW}
      variants={container}
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      <motion.p variants={fade} className="text-sm font-bold tracking-wide text-primary uppercase">
        {kicker}
      </motion.p>
      <Heading
        aria-label={title}
        className="max-w-2xl font-heading text-3xl font-extrabold tracking-tight text-balance sm:text-4xl"
      >
        {words.map((w, i) => (
          // El espacio va afuera del inline-block: si quedara adentro, no
          // habría punto de corte entre palabras y el título no haría wrap.
          <Fragment key={i}>
            <span aria-hidden className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
              <motion.span variants={word} className="inline-block">
                {w}
              </motion.span>
            </span>
            {i < words.length - 1 && " "}
          </Fragment>
        ))}
      </Heading>
      {description && (
        <motion.p variants={fade} className="max-w-xl text-balance text-muted-foreground">
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}
