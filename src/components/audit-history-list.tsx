"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const VISIBLES_INICIALES = 3;

// Lista del historial de auditoría: muestra los registros más recientes y un
// enlace para expandir el resto. Las filas llegan ya renderizadas desde el
// server component (patient-summary.tsx).
export function AuditHistoryList({ items }: { items: ReactNode[] }) {
  const [expandido, setExpandido] = useState(false);
  const hayOcultos = items.length > VISIBLES_INICIALES;
  const visibles = expandido || !hayOcultos ? items : items.slice(0, VISIBLES_INICIALES);

  return (
    <div className="col-span-full flex flex-col">
      <div className="flex flex-col divide-y divide-border">{visibles}</div>
      {hayOcultos && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          aria-expanded={expandido}
          className="mt-2 inline-flex w-fit cursor-pointer items-center gap-1 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {expandido ? "Ver menos" : `Ver todos (${items.length})`}
          <ChevronDown
            className={cn("size-3.5 transition-transform", expandido && "rotate-180")}
            aria-hidden
          />
        </button>
      )}
    </div>
  );
}
