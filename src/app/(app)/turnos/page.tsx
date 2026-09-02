import { getCurrentUser } from "@/lib/session";
import { getDaySlots } from "@/lib/get-day-slots";
import { formatDateParamBA } from "@/lib/timezone";
import { TurnosCalendar } from "@/components/turnos-calendar";

export const dynamic = "force-dynamic";

export default async function TurnosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const today = new Date();
  const { slots, sinConfigurar, diasConHorario } = await getDaySlots(today, user.role);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <TurnosCalendar
        role={user.role}
        initialDate={formatDateParamBA(today)}
        initialSlots={slots}
        initialSinConfigurar={sinConfigurar}
        diasConHorario={diasConHorario}
      />
    </div>
  );
}
