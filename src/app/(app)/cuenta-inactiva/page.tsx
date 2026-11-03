import Link from "next/link";
import { AlertTriangle, ShieldX } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// A esta página redirige `src/proxy.ts` cuando la cuenta del tenant no está
// activa (venció el trial o la suscripción, ver `esActivo()` en
// `src/lib/plan.ts`) o el médico fue suspendido desde /admin/moderacion. Un
// DOCTOR puede seguir yendo a "Mi plan" a pagar; un SECRETARY no tiene forma
// de arreglarlo, así que solo se le pide que avise al médico. (Un médico
// suspendido no llega acá: no puede ni iniciar sesión.)
export default async function CuentaInactivaPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const esDoctor = user.role === "DOCTOR";
  const tenantId = esDoctor ? user.id : user.activeDoctorId;
  const suspendida = tenantId
    ? Boolean(
        (await prisma.user.findUnique({ where: { id: tenantId }, select: { suspendidoAt: true } }))
          ?.suspendidoAt
      )
    : false;

  if (suspendida) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-red-100 text-destructive dark:bg-red-950/50">
          <ShieldX className="size-6" />
        </span>
        <h1 className="text-xl font-semibold">La cuenta del médico está suspendida</h1>
        <p className="text-sm text-muted-foreground">
          {esDoctor
            ? "Tu cuenta fue suspendida por mal uso de la plataforma."
            : "El médico que tenés seleccionado fue suspendido por mal uso de la plataforma, así que por ahora no podés operar su cuenta."}{" "}
          Por cualquier consulta, escribinos a contacto@semio360.com.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
        <AlertTriangle className="size-6" />
      </span>
      <h1 className="text-xl font-semibold">La cuenta no tiene un plan activo</h1>
      {esDoctor ? (
        <>
          <p className="text-sm text-muted-foreground">
            Se venció tu período de prueba o tu suscripción. Elegí un plan para volver a acceder a
            Semio360.
          </p>
          <Button nativeButton={false} render={<Link href="/configuracion?tab=plan" />}>
            Ir a Mi plan
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          El médico que tenés asignado no tiene un plan activo en este momento. Pedile que
          regularice su suscripción para poder seguir usando Semio360.
        </p>
      )}
    </div>
  );
}
