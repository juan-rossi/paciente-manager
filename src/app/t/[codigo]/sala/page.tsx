import type { Metadata } from "next";
import { headers } from "next/headers";
import { Semio360Mark, Semio360Wordmark } from "@/components/brand/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalaVideo } from "@/components/teleconsulta/sala-video";
import { getClientIp } from "@/lib/request-ip";
import { rateLimitOk } from "@/lib/rate-limit";
import { formatHoraBA, TIME_ZONE } from "@/lib/timezone";
import { formatNombreConTitulo, type TituloCortesia } from "@/lib/titulo-cortesia";
import { buscarTurnoPorLinkCodigo } from "@/lib/turno-link-paciente";
import { estadoSala, SALA_ABRE_MINUTOS_ANTES, ventanaSala } from "@/lib/teleconsulta";

// Mismo criterio que los links `/si` y `/no`: el código viaja en la URL, no
// se filtra por Referer ni se indexa.
export const metadata: Metadata = {
  title: "Tu teleconsulta",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ codigo: string }> };

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Sala de espera de la teleconsulta del paciente (link `{videollamada}` del
// recordatorio). Abrirla no crea nada: la sala y el token se piden recién
// al tocar "Entrar a la consulta" (ver /api/t/[codigo]/sala).
export default async function SalaPacientePage({ params }: Props) {
  const { codigo } = await params;

  const permitido = await rateLimitOk(getClientIp({ headers: await headers() }), codigo, "link-turno");
  const turno = permitido ? await buscarTurnoPorLinkCodigo(codigo) : null;

  let contenido: React.ReactNode;
  if (!permitido) {
    contenido = <Mensaje titulo="Demasiados intentos" texto="Probá de nuevo en unos minutos." />;
  } else if (!turno || turno.lugar.tipo !== "VIRTUAL") {
    contenido = (
      <Mensaje
        titulo="Este link no es válido"
        texto="Revisá que esté completo o comunicate con el consultorio."
      />
    );
  } else {
    const fecha = capitalize(
      turno.inicio.toLocaleDateString("es-AR", {
        timeZone: TIME_ZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
    const medico = formatNombreConTitulo(
      turno.doctor.tituloCortesia as TituloCortesia | null,
      turno.doctor.nombre,
    );
    const estado = estadoSala(turno);

    let cuerpo: React.ReactNode;
    if (turno.estado === "CANCELADO") {
      cuerpo = <Aviso texto="Este turno está cancelado. Si necesitás uno nuevo, comunicate con el consultorio." />;
    } else if (estado === "antes") {
      cuerpo = (
        <Aviso
          texto={`La sala se abre ${SALA_ABRE_MINUTOS_ANTES} minutos antes del turno, a las ${formatHoraBA(ventanaSala(turno).desde)} hs. Volvé a abrir este link a esa hora.`}
        />
      );
    } else if (estado === "cerrada") {
      cuerpo = <Aviso texto="Esta teleconsulta ya terminó." />;
    } else {
      cuerpo = (
        <SalaVideo
          endpoint={`/api/t/${codigo}/sala`}
          barraSuperior={<span className="truncate">Teleconsulta con {medico}</span>}
        />
      );
    }

    contenido = (
      <>
        <CardHeader className="items-center justify-items-center gap-1 text-center">
          <div className="mb-4 flex items-center gap-3">
            <Semio360Mark className="size-10" />
            <Semio360Wordmark className="h-7" />
          </div>
          <p className="text-sm text-muted-foreground">Teleconsulta con {medico}</p>
          <CardTitle className="text-xl">
            {fecha} · {formatHoraBA(turno.inicio)} hs
          </CardTitle>
          <p className="text-sm text-muted-foreground">Por videollamada, sin descargar nada</p>
        </CardHeader>
        <CardContent>{cuerpo}</CardContent>
      </>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent)",
        }}
      />
      <Card className="w-full max-w-md [--card-spacing:--spacing(7)]">{contenido}</Card>
    </div>
  );
}

function Mensaje({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <CardHeader className="items-center justify-items-center gap-1 text-center">
      <CardTitle className="text-xl">{titulo}</CardTitle>
      <p className="text-sm text-muted-foreground">{texto}</p>
    </CardHeader>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <p className="rounded-md bg-muted px-3 py-2.5 text-center text-sm text-muted-foreground">
      {texto}
    </p>
  );
}
