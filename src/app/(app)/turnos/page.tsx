import { getCurrentUser } from "@/lib/session";
import { getDaySlots } from "@/lib/get-day-slots";
import { TurnosCalendar } from "@/components/turnos-calendar";

export const dynamic = "force-dynamic";

function toDateParam(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function TurnosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const today = new Date();
  const { slots, sinConfigurar } = await getDaySlots(today, user.role);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <TurnosCalendar
        role={user.role}
        initialDate={toDateParam(today)}
        initialSlots={slots}
        initialSinConfigurar={sinConfigurar}
      />
    </div>
  );
}
