import { AdminFinanzasSkeleton } from "@/components/admin/admin-skeletons";

// En un grupo de rutas por lo mismo que el Dashboard general: en la carpeta
// de arriba este esqueleto también envolvería a Gastos y Costos IA.
export default function Loading() {
  return <AdminFinanzasSkeleton />;
}
