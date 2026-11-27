import { Building2, House, Video, type LucideIcon } from "lucide-react";
import type { LugarTrabajoTipo } from "@/lib/lugar-tipo";

// Mismos íconos que el selector de tipo en "Mi práctica", para que el
// paciente reconozca el lugar igual que el médico lo cargó.
export const LUGAR_TIPO_ICON: Record<LugarTrabajoTipo, LucideIcon> = {
  PARTICULAR: House,
  CONSULTORIO: Building2,
  VIRTUAL: Video,
};
