import { getCurrentUser } from "@/lib/session";
import { getDaySlots } from "@/lib/get-day-slots";
import { getTenantId, resolveActiveLugarId, resolvePuedeBloquearHorarios } from "@/lib/tenant";
import { formatDateParamBA } from "@/lib/timezone";
import { TurnosCalendar } from "@/components/turnos-calendar";

export const dynamic = "force-dynamic";

export default async function TurnosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const tenantId = getTenantId(user);
  const activeLugarId = await resolveActiveLugarId(user);
  const puedeBloquearHorarios = await resolvePuedeBloquearHorarios(user);
  const today = new Date();
  const {
    slots,
    sobreturnos,
    sinConfigurar,
    diasConHorario,
    sobreturnosHabilitados,
    lugares,
    bloqueosDelDia,
  } = await getDaySlots(today, user.role, tenantId, activeLugarId);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <TurnosCalendar
        role={user.role}
        tenantId={tenantId}
        activeLugarId={activeLugarId}
        puedeBloquearHorarios={puedeBloquearHorarios}
        initialDate={formatDateParamBA(today)}
        initialSlots={slots}
        initialSobreturnos={sobreturnos}
        initialSinConfigurar={sinConfigurar}
        initialDiasConHorario={diasConHorario}
        initialSobreturnosHabilitados={sobreturnosHabilitados}
        initialLugares={lugares}
        initialBloqueosDelDia={bloqueosDelDia}
      />
    </div>
  );
}
