import { redirect } from "next/navigation";
import { Download, UserX } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { CancelarBajaButton } from "@/components/cancelar-baja-button";
import { diasParaEliminacion, eliminacionProgramadaPara } from "@/lib/baja-cuenta";
import { TIME_ZONE } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// A esta página redirige `src/proxy.ts` cuando la cuenta del tenant está
// dada de baja (ver src/lib/baja-cuenta.ts). El médico puede descargar sus
// datos o cancelar la baja; su asistente solo ve el aviso.
export default async function CuentaBajaPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const esDoctor = user.role === "DOCTOR";
  const tenantId = esDoctor ? user.id : user.activeDoctorId;
  const bajaAt = esDoctor
    ? user.bajaAt
    : tenantId
      ? (await prisma.user.findUnique({ where: { id: tenantId }, select: { bajaAt: true } }))?.bajaAt
      : null;

  if (!bajaAt) redirect(esDoctor ? "/dashboard" : "/turnos");

  const eliminacion = eliminacionProgramadaPara(bajaAt).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  });

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UserX className="size-6" />
      </span>
      {esDoctor ? (
        <>
          <h1 className="text-xl font-semibold">Diste de baja tu cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Te quedan {diasParaEliminacion(bajaAt)} días para descargar tus datos. El {eliminacion} vamos a
            borrar todo. Las historias clínicas se deben conservar 10 años: guardá tu descarga.
          </p>
          <div className="flex flex-col items-center gap-2 pt-2">
            <Button nativeButton={false} render={<a href="/api/account/export" />}>
              <Download className="size-4" />
              Descargar historia clínica completa
            </Button>
            <CancelarBajaButton />
          </div>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">El médico dio de baja su cuenta</h1>
          <p className="text-sm text-muted-foreground">
            El médico que tenés seleccionado dio de baja su cuenta en Semio360, así que ya no podés operarla.
          </p>
        </>
      )}
    </div>
  );
}
