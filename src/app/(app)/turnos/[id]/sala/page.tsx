import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { formatHoraBA, TIME_ZONE } from "@/lib/timezone";
import { dailyConfigurado } from "@/lib/daily";
import { estadoSala, SALA_ABRE_MINUTOS_ANTES, ventanaSala } from "@/lib/teleconsulta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalaVideo } from "@/components/teleconsulta/sala-video";
import { CopiarLinkSala } from "@/components/teleconsulta/copiar-link-sala";
import { PageEnter } from "@/components/page-transition";
import { teleconsultaHabilitada } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// Sala de la teleconsulta del lado del médico. Solo el médico: en la
// consulta se habla de la salud del paciente, y al lado está su ficha, así
// que el asistente nunca entra.
export default async function SalaMedicoPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!teleconsultaHabilitada() || !user || user.role !== "DOCTOR") notFound();
  const tenantId = getTenantId(user);
  const { id } = await params;

  const turno = await prisma.turno.findFirst({
    where: { id, doctorId: tenantId },
    select: {
      id: true,
      inicio: true,
      fin: true,
      estado: true,
      nombreYApellido: true,
      patientId: true,
      consentimientoRemotoAt: true,
      origen: true,
      lugar: { select: { tipo: true } },
    },
  });
  if (!turno || turno.lugar.tipo !== "VIRTUAL") notFound();

  const estado = estadoSala(turno);
  const fecha = turno.inicio.toLocaleDateString("es-AR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  let cuerpo: React.ReactNode;
  if (turno.estado === "CANCELADO") {
    cuerpo = <Aviso texto="Este turno está cancelado." />;
  } else if (!dailyConfigurado()) {
    cuerpo = (
      <Aviso texto="La videollamada todavía no está configurada en este entorno (falta DAILY_API_KEY)." />
    );
  } else if (estado === "antes") {
    cuerpo = (
      <Aviso
        texto={`La sala se abre ${SALA_ABRE_MINUTOS_ANTES} minutos antes del turno, a las ${formatHoraBA(ventanaSala(turno).desde)} hs.`}
      />
    );
  } else if (estado === "cerrada") {
    cuerpo = <Aviso texto="La sala de este turno ya cerró." />;
  } else {
    cuerpo = (
      <SalaVideo
        endpoint={`/api/turnos/${turno.id}/sala`}
        barraSuperior={
          <>
            <span className="truncate font-medium">{turno.nombreYApellido}</span>
            <span className="flex shrink-0 items-center gap-4">
              {turno.patientId && (
                <a
                  href={`/patients/${turno.patientId}`}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1.5 text-white/80 hover:text-white"
                >
                  <FileText className="size-4" />
                  Abrir ficha
                  <ExternalLink className="size-3" />
                </a>
              )}
              <Link href="/turnos" className="flex items-center gap-1.5 text-white/80 hover:text-white">
                <ArrowLeft className="size-4" />
                Salir
              </Link>
            </span>
          </>
        }
      />
    );
  }

  return (
    <PageEnter>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-6">
        <Link
          href="/turnos"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a turnos
        </Link>
        <Card>
          <CardHeader className="gap-1">
            <p className="text-sm text-muted-foreground">Teleconsulta</p>
            <CardTitle className="text-xl">{turno.nombreYApellido}</CardTitle>
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {fecha} · {formatHoraBA(turno.inicio)} a {formatHoraBA(turno.fin)} hs
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {cuerpo}
            {turno.estado !== "CANCELADO" && estado !== "cerrada" && (
              <div className="flex flex-col gap-2 border-t pt-4">
                <span className="text-sm font-medium">Link para el paciente</span>
                <CopiarLinkSala turnoId={turno.id} />
              </div>
            )}
            {turno.origen === "ONLINE" && (
              <p className="text-xs text-muted-foreground">
                {turno.consentimientoRemotoAt
                  ? "El paciente aceptó la atención por videollamada al reservar."
                  : "Turno sin consentimiento de atención remota registrado."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageEnter>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <p className="rounded-md bg-muted px-3 py-2.5 text-center text-sm text-muted-foreground">{texto}</p>
  );
}
