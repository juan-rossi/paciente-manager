import { DashboardTabs } from "@/components/dashboard-tabs";
import { TrialPorTerminarAviso } from "@/components/trial-por-terminar-aviso";
import { getTurnosDelDia } from "@/lib/turnos-del-dia";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { formatDateParamBA } from "@/lib/timezone";
import { DIAS_AVISO_TRIAL_POR_TERMINAR, diasRestantesDeTrial } from "@/lib/plan";
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

  // Solo se le avisa al médico dueño de la cuenta (no a sus secretarias --
  // ellas no pueden pagar) y solo en la última semana del trial de Básico
  // (Premium nunca tiene trial, ver src/lib/plan.ts).
  const diasTrial = user.role === "DOCTOR" ? diasRestantesDeTrial(user) : null;
  const mostrarAvisoTrial =
    user.role === "DOCTOR" &&
    user.plan === "BASICA" &&
    diasTrial !== null &&
    diasTrial > 0 &&
    diasTrial <= DIAS_AVISO_TRIAL_POR_TERMINAR;

  return (
    <div className="flex flex-col gap-6">
      {mostrarAvisoTrial && user.trialEndsAt && (
        <TrialPorTerminarAviso diasRestantesDeTrial={diasTrial} trialEndsAt={user.trialEndsAt.toISOString()} />
      )}
      <DashboardTabs
        initialDate={formatDateParamBA(hoy)}
        initialTurnos={turnos}
        diasConHorario={diasConHorario}
        totalPacientes={totalPacientes}
      />
    </div>
  );
}
