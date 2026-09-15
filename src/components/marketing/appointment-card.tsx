"use client";

import { motion } from "motion/react";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoTurno } from "./demo-data";

type Props = {
  turno: DemoTurno;
  index?: number;
  selected?: boolean;
  onClick?: () => void;
};

const ESTADO_STYLE: Record<DemoTurno["estado"], string> = {
  confirmado: "border-brand-accent/25 bg-brand-accent/8",
  pendiente: "border-amber-500/25 bg-amber-500/8",
  libre: "border-dashed border-border/70 bg-transparent",
};

export function AppointmentCard({ turno, index = 0, selected, onClick }: Props) {
  const clickable = Boolean(onClick);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick?.();
            }
          : undefined
      }
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        ESTADO_STYLE[turno.estado],
        clickable && "cursor-pointer hover:border-primary/40",
        selected && "border-primary/50 ring-2 ring-primary/15"
      )}
    >
      <div className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-xs font-semibold tabular-nums">
        {turno.hora}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{turno.nombre}</p>
        <p className="truncate text-[11px] text-muted-foreground">{turno.motivo}</p>
      </div>
      {turno.estado === "confirmado" && (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent">
          <Check className="size-3" />
        </span>
      )}
      {turno.estado === "pendiente" && (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
          <Clock className="size-3" />
        </span>
      )}
    </motion.div>
  );
}
