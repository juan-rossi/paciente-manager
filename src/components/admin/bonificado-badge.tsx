import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Marca de médico que usa la plataforma sin pagar (ver `bonificado` en el schema).
export function BonificadoBadge() {
  return (
    <Badge
      variant="outline"
      className="border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-400"
    >
      <Gift className="size-3" />
      Bonificado
    </Badge>
  );
}
