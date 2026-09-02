import { MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatHoraBA, startOfDayBA } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const formatHora = formatHoraBA;

function buildMensaje(template: string, nombre: string, fecha: string, hora: string) {
  return template
    .replaceAll("{nombre}", nombre)
    .replaceAll("{fecha}", fecha)
    .replaceAll("{hora}", hora);
}

function buildWhatsAppHref(telefono: string, mensaje: string) {
  const digits = telefono.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensaje)}`;
}

export default async function RecordatoriosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const doctor = await prisma.user.findFirst({ where: { role: "DOCTOR" } });
  if (!doctor) {
    return (
      <p className="text-sm text-muted-foreground">Todavía no se configuró el médico.</p>
    );
  }

  const dias = doctor.recordatorioDiasAdelanto;
  const targetStart = new Date(
    startOfDayBA(new Date()).getTime() + dias * 24 * 60 * 60 * 1000
  );
  const targetEnd = new Date(targetStart.getTime() + 24 * 60 * 60 * 1000);

  const turnos = await prisma.turno.findMany({
    where: { inicio: { gte: targetStart, lt: targetEnd }, estado: "CONFIRMADO" },
    orderBy: { inicio: "asc" },
    select: { id: true, nombreYApellido: true, telefono: true, inicio: true },
  });

  const fecha = targetStart.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  const fechaLabel = capitalize(
    targetStart.toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );
  const diasLabel = dias === 0 ? " (hoy)" : dias === 1 ? " (mañana)" : ` (dentro de ${dias} días)`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Recordatorios</h1>
        <p className="text-sm text-muted-foreground">
          Turnos del {fechaLabel}
          {diasLabel}.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {turnos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay turnos agendados para ese día.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {turnos.map((turno) => {
                const hora = formatHora(turno.inicio);
                const mensaje = buildMensaje(doctor.mensajeTemplate, turno.nombreYApellido, fecha, hora);
                const href = buildWhatsAppHref(turno.telefono, mensaje);

                return (
                  <li
                    key={turno.id}
                    className="flex items-center gap-3 rounded-md border border-border p-2"
                  >
                    <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold tabular-nums">
                      {hora}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{turno.nombreYApellido}</p>
                      <p className="text-xs text-muted-foreground">{turno.telefono}</p>
                    </div>
                    <Button
                      size="sm"
                      nativeButton={false}
                      render={<a href={href} target="_blank" rel="noopener noreferrer" />}
                    >
                      <MessageCircle className="size-3.5" />
                      Enviar WhatsApp
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
