"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  kicker: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
};

export function SectionHeading({ kicker, title, description, align = "center", className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      <p className="text-sm font-bold tracking-wide text-primary uppercase">{kicker}</p>
      <h2 className="max-w-2xl font-heading text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="max-w-xl text-balance text-muted-foreground">{description}</p>
      )}
    </motion.div>
  );
}
