import { AdminMedicosSkeleton } from "@/components/admin/admin-skeletons";

// Vive en un grupo de rutas (carpeta entre paréntesis, no cambia la URL) a
// propósito: un loading.tsx también envuelve a las rutas hijas, y en la
// carpeta de arriba este esqueleto aparecía antes que el de la pantalla
// destino al navegar a una subruta.
export default function Loading() {
  return <AdminMedicosSkeleton />;
}
