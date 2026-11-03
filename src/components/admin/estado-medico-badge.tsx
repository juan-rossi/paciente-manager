import { Badge } from "@/components/ui/badge";
import type { EstadoMedico } from "@/lib/admin-metrics";

export function EstadoMedicoBadge({ estado }: { estado: EstadoMedico }) {
  if (estado === "ACTIVO") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
      >
        Activo
      </Badge>
    );
  }
  if (estado === "SUSPENDIDO") return <Badge variant="destructive">Suspendido</Badge>;
  return <Badge variant="secondary">Inactivo</Badge>;
}
