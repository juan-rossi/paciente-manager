"use client";

import { motion } from "motion/react";
import { CalendarClock, IdCard, ShieldAlert, Stethoscope } from "lucide-react";
import { DEMO_PACIENTE } from "./demo-data";

export function PatientProfileCard({ compact = false }: { compact?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex h-full flex-col gap-4 p-4"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {DEMO_PACIENTE.nombre
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{DEMO_PACIENTE.nombre}</p>
          <p className="truncate text-xs text-muted-foreground">
            {DEMO_PACIENTE.edad} años · DNI {DEMO_PACIENTE.dni}
          </p>
        </div>
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-2.5 text-[11px]">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
            <p className="flex items-center gap-1.5 font-semibold text-muted-foreground">
              <IdCard className="size-3.5" /> Obra social
            </p>
            <p className="mt-1 font-medium">{DEMO_PACIENTE.obraSocial}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
            <p className="flex items-center gap-1.5 font-semibold text-muted-foreground">
              <CalendarClock className="size-3.5" /> Próximo turno
            </p>
            <p className="mt-1 font-medium">{DEMO_PACIENTE.proximoTurno}</p>
          </div>
          <div className="col-span-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
            <p className="flex items-center gap-1.5 font-semibold text-muted-foreground">
              <ShieldAlert className="size-3.5" /> Antecedentes
            </p>
            <ul className="mt-1 flex flex-col gap-0.5 font-medium">
              {DEMO_PACIENTE.antecedentes.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
            <p className="flex items-center gap-1.5 font-semibold text-muted-foreground">
              <Stethoscope className="size-3.5" /> Última consulta
            </p>
            <p className="mt-1 font-medium">{DEMO_PACIENTE.ultimaConsulta}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
