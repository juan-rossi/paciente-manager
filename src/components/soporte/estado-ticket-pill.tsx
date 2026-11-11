import type { TicketEstado } from "@/generated/prisma/client";
import { ESTADO_CLASES, ESTADO_LABELS } from "@/lib/soporte";
import { cn } from "@/lib/utils";

export function EstadoTicketPill({ estado, className }: { estado: TicketEstado; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-semibold whitespace-nowrap",
        ESTADO_CLASES[estado],
        className
      )}
    >
      {ESTADO_LABELS[estado]}
    </span>
  );
}
