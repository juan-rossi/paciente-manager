import { DashboardTabs } from "@/components/dashboard-tabs";
import { getTurnosDelDia } from "@/lib/turnos-del-dia";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { formatDateParamBA } from "@/lib/timezone";
import { prisma } from "@/lib/prisma";

// Sin esto, Next.js puede prerenderizar la página en build time y congelar la
// lista de "últimos pacientes" en vez de consultarla en cada request.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const hoy = new Date();
  const tenantId = getTenantId(user);
  const [{ turnos, diasConHorario }, totalPacientes] = await Promise.all([
    getTurnosDelDia(hoy, tenantId),
    prisma.patient.count({ where: { doctorId: tenantId, deletedAt: null } }),
  ]);

  return (
    <DashboardTabs
      initialDate={formatDateParamBA(hoy)}
      initialTurnos={turnos}
      diasConHorario={diasConHorario}
      totalPacientes={totalPacientes}
    />
  );
}
