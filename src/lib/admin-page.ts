import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/admin-access";

/**
 * Primera línea de cada página de /admin. El layout ya redirige a quien no es
 * admin, pero en una navegación interna Next puede renderizar la página sin
 * volver a ejecutar el layout: cada página se defiende sola, contra la base
 * (no contra el `isAdmin` guardado en el JWT, que puede estar desactualizado).
 */
export async function verificarAdminEnPagina() {
  const user = await getCurrentUser();
  if (!user || !isPlatformAdmin(user)) notFound();
  return user;
}
