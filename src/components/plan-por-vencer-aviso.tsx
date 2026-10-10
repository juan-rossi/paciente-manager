"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { formatDateParamBA } from "@/lib/timezone";
import { useStoredValue } from "@/lib/use-stored-value";
import { DIAS_AVISO_PLAN_URGENTE } from "@/lib/plan";

type Props = {
  diasRestantes: number;
  planEndsAt: string;
};

// Mismo criterio que el aviso del trial (ver AVISO_TRIAL_CERRADO_KEY en
// trial-por-terminar-aviso.tsx): se recuerda el día del cierre, así vuelve a
// aparecer al otro día mientras el médico no renueve.
const AVISO_PLAN_CERRADO_KEY = "plan_por_vencer_aviso_cerrado_el";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

export function PlanPorVencerAviso({ diasRestantes, planEndsAt }: Props) {
  const [cerrado, setCerrado] = useState(false);
  const urgente = diasRestantes <= DIAS_AVISO_PLAN_URGENTE;

  const cerradoEl = useStoredValue(AVISO_PLAN_CERRADO_KEY);

  function cerrarAviso() {
    setCerrado(true);
    try {
      localStorage.setItem(AVISO_PLAN_CERRADO_KEY, formatDateParamBA(new Date()));
    } catch {
      // Idem -- si no se puede persistir, el cierre solo dura esta vista.
    }
  }

  if (cerrado || cerradoEl === formatDateParamBA(new Date())) return null;

  const dias = `${diasRestantes} ${diasRestantes === 1 ? "día" : "días"}`;
  const fecha = formatFecha(planEndsAt);

  return (
    <div
      className={
        urgente
          ? "relative flex flex-col gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 pr-11 sm:flex-row sm:items-center sm:gap-3.5 dark:border-red-900/50 dark:bg-red-950/40"
          : "relative flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 pr-11 sm:flex-row sm:items-center sm:gap-3.5 dark:border-amber-900/50 dark:bg-amber-950/40"
      }
    >
      <div className="flex items-start gap-3 sm:items-center">
        <div
          className={
            urgente
              ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/60"
              : "flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/60"
          }
        >
          <AlertTriangle
            className={
              urgente
                ? "size-[18px] text-red-700 dark:text-red-400"
                : "size-[18px] text-amber-700 dark:text-amber-400"
            }
          />
        </div>
        <div>
          <p
            className={
              urgente
                ? "font-heading text-sm font-bold text-red-900 dark:text-red-200"
                : "font-heading text-sm font-bold text-amber-900 dark:text-amber-200"
            }
          >
            {urgente ? `Tu acceso termina en ${dias}` : "Tu plan vence pronto"}
          </p>
          <p
            className={
              urgente
                ? "text-sm text-red-800/90 dark:text-red-300/80"
                : "text-sm text-amber-800/90 dark:text-amber-300/80"
            }
          >
            {urgente
              ? `El ${fecha} te vas a quedar sin acceso a tus pacientes y turnos. Renová hoy.`
              : `Te quedan ${dias} de acceso. Renová antes del ${fecha} para seguir usando la app.`}
          </p>
        </div>
      </div>
      <Link
        href="/configuracion?tab=plan"
        className={
          urgente
            ? "ml-12 shrink-0 rounded-lg bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-red-700 sm:ml-auto"
            : "ml-12 shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-amber-700 sm:ml-auto"
        }
      >
        {urgente ? "Renovar ahora" : "Renovar plan"}
      </Link>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={cerrarAviso}
        className={
          urgente
            ? "absolute top-3 right-3 flex size-6 items-center justify-center rounded-full text-red-700/70 transition-colors hover:bg-red-100 hover:text-red-800 sm:top-1/2 sm:-translate-y-1/2 dark:text-red-400/70 dark:hover:bg-red-900/60"
            : "absolute top-3 right-3 flex size-6 items-center justify-center rounded-full text-amber-700/70 transition-colors hover:bg-amber-100 hover:text-amber-800 sm:top-1/2 sm:-translate-y-1/2 dark:text-amber-400/70 dark:hover:bg-amber-900/60"
        }
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
