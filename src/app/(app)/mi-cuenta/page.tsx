import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SeguridadSettings } from "@/components/seguridad-settings";
import { PageEnter } from "@/components/page-transition";

export const dynamic = "force-dynamic";

// Datos de acceso de la secretaria (email y contraseña): son de su cuenta, no
// del médico que asiste. El médico tiene lo mismo en Configuración → Seguridad.
export default async function MiCuentaPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "DOCTOR") redirect("/configuracion?tab=seguridad");

  return (
    <PageEnter>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold">Mi cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Tu email y tu contraseña para ingresar a Semio 360. Son tuyos: no cambian según el médico que estés
            asistiendo.
          </p>
        </div>
        <SeguridadSettings email={user.email} />
      </div>
    </PageEnter>
  );
}
