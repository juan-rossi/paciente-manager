import { getCurrentUser } from "@/lib/session";
import { getTenantId, resolveActiveLugarId } from "@/lib/tenant";
import { getRecordatoriosDelDia } from "@/lib/get-recordatorios-del-dia";
import { formatDateParamBA } from "@/lib/timezone";
import { RecordatoriosCalendar } from "@/components/recordatorios-calendar";

export const dynamic = "force-dynamic";

export default async function RecordatoriosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!user.mensajeriaHabilitada) {
    return (
      <p className="text-sm text-muted-foreground">
        La mensajería está deshabilitada. Podés activarla desde Configuración → Mensajería.
      </p>
    );
  }

  const tenantId = getTenantId(user);
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
        mensajeTemplate={user.mensajeTemplate}
      />
    </div>
  );
}
