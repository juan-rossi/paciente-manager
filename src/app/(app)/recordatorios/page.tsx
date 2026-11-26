import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getTenantId, resolveActiveLugarId } from "@/lib/tenant";
import { getRecordatoriosDelDia } from "@/lib/get-recordatorios-del-dia";
import { getTurnosPendientesDeAviso } from "@/lib/turnos-pendientes-aviso";
import { formatDateParamBA } from "@/lib/timezone";
import { montoDeTeleconsulta } from "@/lib/teleconsulta-cobro";
import { RecordatoriosCalendar } from "@/components/recordatorios-calendar";
import { RecordatoriosPendientes } from "@/components/recordatorios-pendientes";
import { PageEnter } from "@/components/page-transition";

export const dynamic = "force-dynamic";

export default async function RecordatoriosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const tenantId = getTenantId(user);

  // La mensajería (habilitada/plantilla) es una configuración del médico
  // (tenant), no de la cuenta que está logueada -- para un asistente,
  // `user.mensajeTemplate`/`user.mensajeriaHabilitada` son los de SU propia
  // fila (siempre el default, nunca los tocó), no los del médico que
  // configuró desde Configuración → Mensajería.
  const doctor = await prisma.user.findUniqueOrThrow({
    where: { id: tenantId },
    select: {
      mensajeriaHabilitada: true,
      mensajeTemplate: true,
      mensajeTemplateVirtual: true,
      recordatorioAutoEnviado: true,
      mensajeTemplateCancelado: true,
      mensajeTemplateAplazado: true,
      mensajeTemplatePasoTeleconsulta: true,
      teleconsultaCobro: true,
      aliasCobro: true,
      montoTeleconsulta: true,
      montoTeleconsultaUsaParticular: true,
      montoConsultaParticular: true,
    },
  });

  if (!doctor.mensajeriaHabilitada) {
    return (
      <p className="text-sm text-muted-foreground">
        La mensajería está deshabilitada. Podés activarla desde Configuración → Mensajería.
      </p>
    );
  }

  const cobro = {
    teleconsultaCobro: doctor.teleconsultaCobro,
    aliasCobro: doctor.aliasCobro,
    monto: montoDeTeleconsulta(doctor, doctor.montoConsultaParticular),
  };

  const activeLugarId = await resolveActiveLugarId(user);
  const today = new Date();
  const [{ turnos, diasConHorario, sinConfigurar }, pendientes] = await Promise.all([
    getRecordatoriosDelDia(today, tenantId, activeLugarId),
    getTurnosPendientesDeAviso(tenantId, activeLugarId),
  ]);

  return (
    <PageEnter>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Recordatorios</h1>
        <RecordatoriosPendientes
          initialPendientes={pendientes}
          mensajeTemplateCancelado={doctor.mensajeTemplateCancelado}
          mensajeTemplateAplazado={doctor.mensajeTemplateAplazado}
          avisoPasoTeleconsulta={{ plantilla: doctor.mensajeTemplatePasoTeleconsulta, cobro }}
        />
        <RecordatoriosCalendar
          tenantId={tenantId}
          activeLugarId={activeLugarId}
          initialDate={formatDateParamBA(today)}
          initialTurnos={turnos}
          initialDiasConHorario={diasConHorario}
          initialSinConfigurar={sinConfigurar}
          plantillas={{ general: doctor.mensajeTemplate, virtual: doctor.mensajeTemplateVirtual }}
          autoMarcarEnviado={doctor.recordatorioAutoEnviado}
          cobro={cobro}
        />
      </div>
    </PageEnter>
  );
}
