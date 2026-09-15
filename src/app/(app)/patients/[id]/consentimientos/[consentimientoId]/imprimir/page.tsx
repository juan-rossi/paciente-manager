import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { registrarAuditoria } from "@/lib/audit-log";
import { PrintButton } from "@/components/print-button";
import { Card, CardContent } from "@/components/ui/card";
import { TIME_ZONE } from "@/lib/timezone";

type Props = { params: Promise<{ id: string; consentimientoId: string }> };

function formatFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

export default async function ImprimirConsentimientoPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const tenantId = getTenantId(user);

  const { id, consentimientoId } = await params;

  const consentimiento = await prisma.consentimientoInformado.findFirst({
    where: {
      id: consentimientoId,
      patientId: id,
      deletedAt: null,
      patient: { doctorId: tenantId },
    },
    include: { patient: true },
  });

  if (!consentimiento) notFound();

  const doctor = await prisma.user.findUnique({
    where: { id: tenantId },
    select: { nombre: true, apellido: true, nroMatricula: true },
  });

  // Deja constancia de cuándo se imprimió este consentimiento para firma en
  // papel -- útil como evidencia de que el trámite escrito (art. 7-8) se
  // llevó adelante.
  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "EXPORTAR",
    entidad: "CONSENTIMIENTO",
    entidadId: consentimiento.id,
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-muted-foreground">
          Documento de consentimiento informado para firmar (Ley 26.529, art. 7-8).
        </p>
        <PrintButton />
      </div>

      <Card className="print:rounded-none print:border-none print:bg-transparent print:py-0 print:shadow-none">
        <CardContent className="flex flex-col gap-6 print:px-0">
          <header className="flex flex-col gap-1 border-b-2 border-foreground pb-4">
            <h1 className="text-xl font-bold">Consentimiento Informado</h1>
            <p className="text-sm text-muted-foreground">
              {doctor ? `${doctor.nombre} ${doctor.apellido}`.trim() : ""}
              {doctor?.nroMatricula ? ` — Matrícula ${doctor.nroMatricula}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Fecha del consentimiento: {formatFecha(consentimiento.fecha)} — documento generado
              el {new Date().toLocaleDateString("es-AR", { timeZone: TIME_ZONE })}
            </p>
          </header>

          <section className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Paciente</span>
            <p>
              {consentimiento.patient.nombreYApellido}
              {consentimiento.patient.nroDocumento
                ? ` — DNI ${consentimiento.patient.nroDocumento}`
                : ""}
            </p>
          </section>

          <section className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">
              Procedimiento / tratamiento
            </span>
            <p className="font-semibold">{consentimiento.procedimiento}</p>
          </section>

          <section className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">
              Riesgos, beneficios y consecuencias informadas
            </span>
            <p className="whitespace-pre-wrap">{consentimiento.riesgosBeneficios}</p>
          </section>

          {consentimiento.alternativas && (
            <section className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold text-muted-foreground">
                Alternativas informadas
              </span>
              <p className="whitespace-pre-wrap">{consentimiento.alternativas}</p>
            </section>
          )}

          <section className="text-sm leading-relaxed">
            <p>
              Declaro haber sido informado/a de forma clara y comprensible sobre el
              procedimiento/tratamiento descripto, sus riesgos, beneficios, alternativas y las
              consecuencias previsibles de no realizarlo, conforme a la Ley 26.529 de Derechos
              del Paciente, y por la presente{" "}
              <strong>{consentimiento.estado === "OTORGADO" ? "OTORGO" : "RECHAZO"}</strong> mi
              consentimiento para su realización.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Puedo revocar este consentimiento en cualquier momento, dejando constancia expresa
              de ello (art. 10).
            </p>
          </section>

          <section className="mt-8 grid grid-cols-2 gap-8 text-sm">
            <div className="flex flex-col gap-8">
              <div className="border-b border-foreground pb-1">&nbsp;</div>
              <p className="text-xs text-muted-foreground">
                Firma del paciente (o representante legal)
              </p>
            </div>
            <div className="flex flex-col gap-8">
              <div className="border-b border-foreground pb-1">&nbsp;</div>
              <p className="text-xs text-muted-foreground">
                Firma del profesional
                {doctor?.nroMatricula ? ` — Matrícula ${doctor.nroMatricula}` : ""}
              </p>
            </div>
          </section>

          <p className="text-center text-xs text-muted-foreground">
            Documento generado por Semio360 conforme a la Ley 26.529 de Derechos del Paciente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
