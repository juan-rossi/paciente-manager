"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { formatDateParamBA } from "@/lib/timezone";

type Props = {
  diasRestantesDeTrial: number;
  trialEndsAt: string;
};

// Se recuerda el día (no un id fijo) en el que se cerró el aviso -- así
// vuelve a aparecer solo al otro día si el médico todavía no contrató un
// plan, en vez de quedar cerrado para siempre como el aviso de pago
// pendiente (ver AVISO_PENDIENTE_CERRADO_KEY en plan-settings.tsx).
const AVISO_TRIAL_CERRADO_KEY = "trial_aviso_cerrado_el";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

export function TrialPorTerminarAviso({ diasRestantesDeTrial, trialEndsAt }: Props) {
  const [cerrado, setCerrado] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(AVISO_TRIAL_CERRADO_KEY) === formatDateParamBA(new Date())) {
        setCerrado(true);
      }
    } catch {
      // Storage no disponible -- el aviso simplemente se puede volver a
      // mostrar, no es crítico.
    }
  }, []);

  function cerrarAviso() {
    setCerrado(true);
    try {
      localStorage.setItem(AVISO_TRIAL_CERRADO_KEY, formatDateParamBA(new Date()));
    } catch {
      // Idem -- si no se puede persistir, el cierre solo dura esta vista.
    }
  }

  if (cerrado) return null;

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 pr-11 sm:flex-row sm:items-center sm:gap-3.5 dark:border-amber-900/50 dark:bg-amber-950/40">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/60">
          <AlertTriangle className="size-[18px] text-amber-700 dark:text-amber-400" />
        </div>
        <div>
          <p className="font-heading text-sm font-bold text-amber-900 dark:text-amber-200">
            Tu período de prueba está por terminar
          </p>
          <p className="text-sm text-amber-800/90 dark:text-amber-300/80">
            Contratá un plan antes del {formatFecha(trialEndsAt)} para no perder el acceso a la app
            (quedan {diasRestantesDeTrial} {diasRestantesDeTrial === 1 ? "día" : "días"}).
          </p>
        </div>
      </div>
      <Link
        href="/configuracion?tab=plan"
        className="ml-12 shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-amber-700 sm:ml-auto"
      >
        Contratar plan
      </Link>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={cerrarAviso}
        className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full text-amber-700/70 transition-colors hover:bg-amber-100 hover:text-amber-800 sm:top-1/2 sm:-translate-y-1/2 dark:text-amber-400/70 dark:hover:bg-amber-900/60"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
