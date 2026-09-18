import { getCurrentUser } from "@/lib/session";
import { getDaySlots } from "@/lib/get-day-slots";
import { getTenantId } from "@/lib/tenant";
import { formatDateParamBA } from "@/lib/timezone";
import { TurnosCalendar } from "@/components/turnos-calendar";

export const dynamic = "force-dynamic";

export default async function TurnosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const tenantId = getTenantId(user);
  const today = new Date();
  const { slots, sobreturnos, sinConfigurar, diasConHorario, sobreturnosHabilitados } =
    await getDaySlots(today, user.role, tenantId);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      {/* `key` fuerza a remontar el calendario (y resetear todo su estado
          interno) cuando una secretaria cambia de médico activo -- si no,
          `router.refresh()` recalcula los props en el server pero el cliente
          conserva el `useState` viejo y sigue mostrando los turnos del
          médico anterior. */}
      <TurnosCalendar
        key={tenantId}
        role={user.role}
        initialDate={formatDateParamBA(today)}
        initialSlots={slots}
        initialSobreturnos={sobreturnos}
        initialSinConfigurar={sinConfigurar}
        diasConHorario={diasConHorario}
        sobreturnosHabilitados={sobreturnosHabilitados}
      />
    </div>
  );
}
