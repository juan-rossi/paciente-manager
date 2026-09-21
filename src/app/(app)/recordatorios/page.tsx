import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getTenantId, resolveActiveLugarId } from "@/lib/tenant";
import { getRecordatoriosDelDia } from "@/lib/get-recordatorios-del-dia";
import { formatDateParamBA } from "@/lib/timezone";
import { RecordatoriosCalendar } from "@/components/recordatorios-calendar";

export const dynamic = "force-dynamic";

export default async function RecordatoriosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const tenantId = getTenantId(user);

  // La mensajería (habilitada/plantilla) es una configuración del médico
  // (tenant), no de la cuenta que está logueada -- para una secretaria,
  // `user.mensajeTemplate`/`user.mensajeriaHabilitada` son los de SU propia
  // fila (siempre el default, nunca los tocó), no los del médico que
  // configuró desde Configuración → Mensajería.
  const doctor = await prisma.user.findUniqueOrThrow({
    where: { id: tenantId },
    select: { mensajeriaHabilitada: true, mensajeTemplate: true },
  });

  if (!doctor.mensajeriaHabilitada) {
    return (
      <p className="text-sm text-muted-foreground">
        La mensajería está deshabilitada. Podés activarla desde Configuración → Mensajería.
      </p>
    );
  }

  const activeLugarId = await resolveActiveLugarId(user);
  const today = new Date();
  const { turnos, diasConHorario, sinConfigurar } = await getRecordatoriosDelDia(
    today,
    tenantId,
    activeLugarId
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Recordatorios</h1>
      <RecordatoriosCalendar
        tenantId={tenantId}
        activeLugarId={activeLugarId}
        initialDate={formatDateParamBA(today)}
        initialTurnos={turnos}
        initialDiasConHorario={diasConHorario}
        initialSinConfigurar={sinConfigurar}
        mensajeTemplate={doctor.mensajeTemplate}
      />
    </div>
  );
}
