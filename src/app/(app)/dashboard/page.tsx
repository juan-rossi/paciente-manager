import { DashboardTabs } from "@/components/dashboard-tabs";
import { PlanPorVencerAviso } from "@/components/plan-por-vencer-aviso";
import { TrialPorTerminarAviso } from "@/components/trial-por-terminar-aviso";
import { getTurnosDelDia } from "@/lib/turnos-del-dia";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { formatDateParamBA } from "@/lib/timezone";
import {
  DIAS_AVISO_PLAN_POR_VENCER,
  DIAS_AVISO_TRIAL_POR_TERMINAR,
  diasRestantesDePagoUnico,
  diasRestantesDeTrial,
} from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { PAGOS_HABILITADOS } from "@/lib/pagos";

// Sin esto, Next.js puede prerenderizar la página en build time y congelar la
// lista de "últimos pacientes" en vez de consultarla en cada request.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const hoy = new Date();
  const tenantId = getTenantId(user);
  const [{ turnos, diasConHorario }, totalPacientes, totalPracticas, totalPrepagas] = await Promise.all([
    getTurnosDelDia(hoy, tenantId),
    prisma.patient.count({ where: { doctorId: tenantId, deletedAt: null } }),
    prisma.lugarDeTrabajo.count({ where: { userId: tenantId, deletedAt: null } }),
    user.role === "DOCTOR" ? prisma.doctorPrepaga.count({ where: { doctorId: user.id } }) : Promise.resolve(0),
  ]);

  // Solo se le avisa al médico dueño de la cuenta (no a sus secretarias --
  // ellas no pueden pagar) y solo en la última semana del trial de Básico
  // (Premium nunca tiene trial, ver src/lib/plan.ts). Si ya tiene una
  // suscripción paga vigente (`planEndsAt`), el trial en papel ya no importa.
  const diasTrial = user.role === "DOCTOR" ? diasRestantesDeTrial(user) : null;
  const tienePlanPagoVigente = Boolean(user.planEndsAt && user.planEndsAt.getTime() > Date.now());
  // Ambos avisos empujan a contratar/renovar: sin pagos habilitados se ocultan.
  const mostrarAvisoTrial =
    PAGOS_HABILITADOS &&
    user.role === "DOCTOR" &&
    user.plan === "BASICA" &&
    !tienePlanPagoVigente &&
    diasTrial !== null &&
    diasTrial > 0 &&
    diasTrial <= DIAS_AVISO_TRIAL_POR_TERMINAR;

  // Pago único de 6 meses o más (no la suscripción mensual, que se renueva
  // sola): en las últimas dos semanas se avisa que el acceso está por
  // terminar. Solo al médico dueño, por el mismo motivo que el trial.
  const diasPlan = user.role === "DOCTOR" ? diasRestantesDePagoUnico(user) : null;
  const mostrarAvisoPlan =
    PAGOS_HABILITADOS && diasPlan !== null && diasPlan > 0 && diasPlan <= DIAS_AVISO_PLAN_POR_VENCER;

  return (
    <div className="flex flex-col gap-6">
      {mostrarAvisoPlan && user.planEndsAt && (
        <PlanPorVencerAviso diasRestantes={diasPlan} planEndsAt={user.planEndsAt.toISOString()} />
      )}
      {mostrarAvisoTrial && user.trialEndsAt && (
        <TrialPorTerminarAviso diasRestantesDeTrial={diasTrial} trialEndsAt={user.trialEndsAt.toISOString()} />
      )}
      <DashboardTabs
        initialDate={formatDateParamBA(hoy)}
        initialTurnos={turnos}
        diasConHorario={diasConHorario}
        totalPacientes={totalPacientes}
        sinPracticas={totalPracticas === 0}
        puedeConfigurarPracticas={user.role === "DOCTOR"}
        sugerirPerfilPublico={user.role === "DOCTOR" && totalPracticas > 0 && !user.perfilPublico}
        sugerirCargarPrepagas={user.role === "DOCTOR" && totalPrepagas === 0}
      />
    </div>
  );
}
