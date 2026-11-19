import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { registrarAuditoria } from "@/lib/audit-log";
import { tenantEsOdontologo } from "@/lib/odontograma-server";
import { PrintButton } from "@/components/print-button";
import { Card, CardContent } from "@/components/ui/card";
import { TIME_ZONE } from "@/lib/timezone";
import {
  calcularTotal,
  describirUbicacion,
  formatPesos,
  presupuestoFromDb,
  PRESUPUESTO_ESTADO_LABELS,
} from "@/lib/presupuesto";

type Props = { params: Promise<{ id: string; presupuestoId: string }> };

function formatFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00.000Z`).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

export default async function ImprimirPresupuestoPage({ params }: Props) {
  const user = await getCurrentUser();
  // El presupuesto detalla el plan de tratamiento (dato clínico): solo el
  // médico, igual que la historia clínica.
  if (!user || user.role !== "DOCTOR") notFound();
  const tenantId = getTenantId(user);
  if (!(await tenantEsOdontologo(tenantId))) notFound();

  const { id, presupuestoId } = await params;

  const fila = await prisma.presupuestoOdontologico.findFirst({
    where: { id: presupuestoId, patientId: id, deletedAt: null, patient: { doctorId: tenantId } },
    include: { items: true, patient: true },
  });
  if (!fila) notFound();

  const presupuesto = presupuestoFromDb(fila);
  const patient = fila.patient;
  const total = calcularTotal(presupuesto.items);

  const doctor = await prisma.user.findUnique({
    where: { id: tenantId },
    select: {
      nombre: true,
      apellido: true,
      nroMatricula: true,
      nombreConsultorio: true,
      telefono: true,
      direccion: true,
    },
  });

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "EXPORTAR",
    entidad: "PRESUPUESTO",
    entidadId: presupuesto.id,
  });

  const contacto = [doctor?.nombreConsultorio, doctor?.direccion, doctor?.telefono].filter(Boolean).join(" — ");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-muted-foreground">
          Presupuesto para entregar al paciente. Estado actual:{" "}
          {PRESUPUESTO_ESTADO_LABELS[presupuesto.estado].toLowerCase()}.
        </p>
        <PrintButton />
      </div>

      <Card className="print:rounded-none print:border-none print:bg-transparent print:py-0 print:shadow-none">
        <CardContent className="flex flex-col gap-6 print:px-0">
          <header className="flex flex-col gap-1 border-b-2 border-foreground pb-4">
            <h1 className="text-xl font-bold">Presupuesto odontológico</h1>
            <p className="text-sm text-muted-foreground">
              {doctor ? `${doctor.nombre} ${doctor.apellido}`.trim() : ""}
              {doctor?.nroMatricula ? ` — Matrícula ${doctor.nroMatricula}` : ""}
            </p>
            {contacto && <p className="text-xs text-muted-foreground">{contacto}</p>}
            <p className="text-xs text-muted-foreground">
              Fecha del presupuesto: {formatFecha(presupuesto.fecha)} — documento generado el{" "}
              {new Date().toLocaleDateString("es-AR", { timeZone: TIME_ZONE })}
            </p>
          </header>

          <section className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Paciente</span>
            <p>
              {patient.nombreYApellido}
              {patient.nroDocumento ? ` — DNI ${patient.nroDocumento}` : ""}
            </p>
          </section>

          <section className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Prácticas presupuestadas</span>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-foreground text-left text-xs">
                  <th className="py-1.5 pr-3 font-semibold">Pieza / caras</th>
                  <th className="py-1.5 pr-3 font-semibold">Código</th>
                  <th className="py-1.5 pr-3 font-semibold">Práctica</th>
                  <th className="py-1.5 text-right font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody>
                {presupuesto.items.map((item) => (
                  <tr key={item.id} className="border-b border-border align-top">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{describirUbicacion(item)}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs whitespace-nowrap">{item.codigo}</td>
                    <td className="py-1.5 pr-3">{item.descripcion}</td>
                    <td className="py-1.5 text-right whitespace-nowrap tabular-nums">{formatPesos(item.monto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 pr-3 text-right font-semibold">
                    Total
                  </td>
                  <td className="pt-3 text-right text-base font-bold whitespace-nowrap tabular-nums">
                    {formatPesos(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          {presupuesto.nota && (
            <section className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold text-muted-foreground">Observaciones</span>
              <p className="whitespace-pre-wrap">{presupuesto.nota}</p>
            </section>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Los montos corresponden a honorarios particulares y pueden variar si durante el tratamiento
            surgen hallazgos que requieran prácticas no previstas, que se informarán antes de realizarlas.
          </p>

          <section className="mt-8 grid grid-cols-2 gap-8 text-sm">
            <div className="flex flex-col gap-8">
              <div className="border-b border-foreground pb-1">&nbsp;</div>
              <p className="text-xs text-muted-foreground">Firma del paciente (conformidad)</p>
            </div>
            <div className="flex flex-col gap-8">
              <div className="border-b border-foreground pb-1">&nbsp;</div>
              <p className="text-xs text-muted-foreground">
                Firma del profesional
                {doctor?.nroMatricula ? ` — Matrícula ${doctor.nroMatricula}` : ""}
              </p>
            </div>
          </section>

          <p className="text-center text-xs text-muted-foreground">Documento generado por Semio360.</p>
        </CardContent>
      </Card>
    </div>
  );
}
