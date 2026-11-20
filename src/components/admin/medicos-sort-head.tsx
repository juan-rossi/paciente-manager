import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type OrdenMedicos = "medico" | "estado" | "plan" | "tipo" | "alta" | "vence" | "uso";
export type DireccionOrden = "asc" | "desc";

export const ORDENES_MEDICOS: OrdenMedicos[] = ["medico", "estado", "plan", "tipo", "alta", "vence", "uso"];

// Primera dirección al hacer click: lo que uno espera ver primero en cada
// columna (A→Z, altas más nuevas, vencimientos más próximos, más uso).
export const DIRECCION_INICIAL: Record<OrdenMedicos, DireccionOrden> = {
  medico: "asc",
  estado: "asc",
  plan: "asc",
  tipo: "asc",
  alta: "desc",
  vence: "asc",
  uso: "desc",
};

/**
 * Header ordenable. Ciclo: dirección inicial → inversa → orden por defecto.
 * Conserva el resto de los filtros de la URL.
 */
export function MedicosSortHead({
  columna,
  label,
  ordenActual,
  dirActual,
  params,
}: {
  columna: OrdenMedicos;
  label: string;
  ordenActual: OrdenMedicos | undefined;
  dirActual: DireccionOrden | undefined;
  params: Record<string, string | undefined>;
}) {
  const activa = ordenActual === columna;
  const inicial = DIRECCION_INICIAL[columna];

  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "orden" && k !== "dir") next.set(k, v);
  }
  if (!activa) {
    next.set("orden", columna);
    next.set("dir", inicial);
  } else if (dirActual === inicial) {
    next.set("orden", columna);
    next.set("dir", inicial === "asc" ? "desc" : "asc");
  }
  // Activa en la dirección inversa → vuelve al orden por defecto (sin params).
  const qs = next.toString();

  const Icono = !activa ? ArrowUpDown : dirActual === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead aria-sort={activa ? (dirActual === "asc" ? "ascending" : "descending") : undefined}>
      <Link
        href={qs ? `/admin/medicos?${qs}` : "/admin/medicos"}
        scroll={false}
        replace
        className={cn(
          "group -mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground",
          activa && "text-foreground"
        )}
      >
        {label}
        <Icono
          className={cn(
            "size-3 shrink-0 transition-opacity",
            activa ? "opacity-100" : "opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60"
          )}
        />
      </Link>
    </TableHead>
  );
}
