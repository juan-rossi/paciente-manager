import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Semio360Mark, Semio360Wordmark } from "@/components/brand/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientIp } from "@/lib/request-ip";
import { rateLimitOk } from "@/lib/rate-limit";
import { formatHoraBA, TIME_ZONE } from "@/lib/timezone";
import {
  formatNombreConTitulo,
  type TituloCortesia,
} from "@/lib/titulo-cortesia";
import { buscarTurnoPorLinkCodigo } from "@/lib/turno-link-paciente";
import {
  CANCELACION_ANTELACION_MINUTOS,
  puedeCancelarOnline,
} from "@/lib/turno-cancelacion-reglas";
import { LinkTurnoAccion } from "./link-turno-accion";

// El código viaja en la URL: `no-referrer` evita que se filtre en el header
// Referer, y no se indexa (ver también robots.ts).
export const metadata: Metadata = {
  title: "Tu turno",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ codigo: string; accion: string }> };

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Página del link `{confirmar}` (`/si`) o `{cancelar}` (`/no`) del
// recordatorio. Solo muestra el turno y un botón: abrirla nunca confirma ni
// cancela (WhatsApp la abre solo para armar la vista previa).
export default async function LinkTurnoPage({ params }: Props) {
  const { codigo, accion } = await params;
  if (accion !== "si" && accion !== "no") notFound();

  const permitido = await rateLimitOk(
    getClientIp({ headers: await headers() }),
    codigo,
    "link-turno",
  );
  const turno = permitido ? await buscarTurnoPorLinkCodigo(codigo) : null;

  let contenido: React.ReactNode;
  if (!permitido) {
    contenido = (
      <Mensaje
        titulo="Demasiados intentos"
        texto="Probá de nuevo en unos minutos."
      />
    );
  } else if (!turno) {
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
    const lugar = [
      turno.lugar.nombre,
      turno.lugar.direccion,
      turno.lugar.ciudad,
    ]
      .filter(Boolean)
      .join(" · ");

    let estado: React.ReactNode;
    if (turno.estado === "CANCELADO") {
      estado = (
        <Aviso texto="Este turno está cancelado. Si necesitás uno nuevo, comunicate con el consultorio." />
      );
    } else if (turno.inicio <= new Date()) {
      estado = <Aviso texto="Este turno ya pasó." />;
    } else if (accion === "no" && !puedeCancelarOnline(turno.inicio)) {
      estado = (
        <Aviso
          texto={`Ya no se puede cancelar online (hasta ${CANCELACION_ANTELACION_MINUTOS / 60} hora antes del turno). Comunicate con el consultorio.`}
        />
      );
    } else {
      estado = (
        <LinkTurnoAccion
          codigo={codigo}
          accion={accion}
          yaConfirmado={turno.confirmadoAt !== null}
          puedeCancelar={puedeCancelarOnline(turno.inicio)}
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
          <p className="text-sm text-muted-foreground">Tu turno con {medico}</p>
          <CardTitle className="text-xl">
            {fecha} · {formatHoraBA(turno.inicio)} hs
          </CardTitle>
          {lugar && <p className="text-sm text-muted-foreground">{lugar}</p>}
        </CardHeader>
        <CardContent>{estado}</CardContent>
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
      <Card className="w-full max-w-md [--card-spacing:--spacing(7)]">
        {contenido}
      </Card>
    </div>
  );
}

function Mensaje({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <CardHeader className="items-center justify-items-center gap-1 text-center">
      <div className="mb-4 flex items-center gap-3">
        <Semio360Mark className="size-10" />
        <Semio360Wordmark className="h-7" />
      </div>
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
