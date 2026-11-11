import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import type { TicketEstado } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatFechaTicket, TIPO_LABELS } from "@/lib/soporte";
import { EstadoTicketPill } from "@/components/soporte/estado-ticket-pill";
import { ResponderTicketForm } from "@/components/soporte/responder-ticket-form";
import { RefrescarAlMontar } from "@/components/soporte/refrescar-al-montar";
import { PageEnter } from "@/components/page-transition";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

// Recorrido que ve el usuario en el panel lateral. DESCARTADO no es un paso:
// se muestra aparte.
const RECORRIDO: { estado: TicketEstado; label: string }[] = [
  { estado: "NUEVO", label: "Recibido" },
  { estado: "EN_REVISION", label: "En revisión" },
  { estado: "PLANIFICADO", label: "Planificado" },
  { estado: "RESUELTO", label: "Resuelto" },
];

export default async function SoporteTicketPage({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;

  const ticket = await prisma.ticketSoporte.findFirst({
    where: { id, autorId: user.id },
    select: {
      id: true,
      tipo: true,
      estado: true,
      asunto: true,
      noLeidoAutor: true,
      createdAt: true,
      updatedAt: true,
      // Las notas internas del equipo nunca salen de /admin.
      mensajes: {
        where: { interno: false },
        orderBy: { createdAt: "asc" },
        select: { id: true, esEquipo: true, cuerpo: true, createdAt: true },
      },
    },
  });
  if (!ticket) notFound();

  // Abrirlo marca leída la respuesta (baja el contador del header). Se
  // conserva `updatedAt` explícito: leer no es actividad nueva y no tiene que
  // reordenar las bandejas.
  if (ticket.noLeidoAutor) {
    await prisma.ticketSoporte.update({
      where: { id },
      data: { noLeidoAutor: false, updatedAt: ticket.updatedAt },
    });
  }

  const cerrado = ticket.estado === "RESUELTO" || ticket.estado === "DESCARTADO";
  const ultimaRespuesta = ticket.mensajes.findLast((m) => m.esEquipo);
  const pasoActual = RECORRIDO.findIndex((p) => p.estado === ticket.estado);

  return (
    <PageEnter>
      <div className="flex flex-col gap-4">
        {ticket.noLeidoAutor && <RefrescarAlMontar />}
        <Link
          href="/soporte"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Mis mensajes
        </Link>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Conversación */}
          <section className="flex min-w-0 flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h1 className="font-heading text-xl font-semibold break-words">{ticket.asunto}</h1>

            <ol className="flex flex-col gap-3">
              {ticket.mensajes.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "flex max-w-[85%] flex-col gap-1 rounded-xl px-4 py-3 sm:max-w-[75%]",
                    m.esEquipo ? "self-start border border-primary/20 bg-primary/5" : "self-end bg-muted"
                  )}
                >
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {m.esEquipo ? "Equipo de Semio 360" : "Vos"} · {formatFechaTicket(m.createdAt)}
                  </span>
                  <p className="text-sm leading-relaxed break-words whitespace-pre-line">{m.cuerpo}</p>
                </li>
              ))}
            </ol>

            {!ultimaRespuesta && (
              <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                ¡Gracias por escribirnos! Ya recibimos tu mensaje y te vamos a responder acá. También te avisamos
                por email.
              </p>
            )}

            <div className="border-t border-border pt-5">
              <ResponderTicketForm ticketId={ticket.id} cerrado={cerrado} />
            </div>
          </section>

          {/* Panel lateral: datos y recorrido (debajo en mobile) */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
            <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-5 lg:grid-cols-1">
              <Dato label="Estado">
                <EstadoTicketPill estado={ticket.estado} />
              </Dato>
              <Dato label="Tipo">{TIPO_LABELS[ticket.tipo]}</Dato>
              <Dato label="Enviado">{formatFechaTicket(ticket.createdAt)}</Dato>
              <Dato label="Última respuesta">
                {ultimaRespuesta ? formatFechaTicket(ultimaRespuesta.createdAt) : "Todavía no respondimos"}
              </Dato>
            </dl>

            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Recorrido
              </span>
              {ticket.estado === "DESCARTADO" ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Por ahora no vamos a avanzar con esto. Te contamos el motivo en la conversación.
                </p>
              ) : (
                <ol className="flex flex-col">
                  {RECORRIDO.map((paso, i) => {
                    const hecho = i < pasoActual || (i === pasoActual && paso.estado === "RESUELTO");
                    const actual = i === pasoActual;
                    return (
                      <li key={paso.estado} className="relative flex items-center gap-3 pb-4 last:pb-0">
                        {i < RECORRIDO.length - 1 && (
                          <span
                            aria-hidden
                            className={cn(
                              "absolute top-5 left-[9px] h-[calc(100%-12px)] w-0.5",
                              i < pasoActual ? "bg-primary" : "bg-border"
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "relative flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                            hecho
                              ? "border-primary bg-primary text-primary-foreground"
                              : actual
                                ? "border-primary bg-card"
                                : "border-border bg-card"
                          )}
                        >
                          {hecho && <Check className="size-3" strokeWidth={3} />}
                          {actual && !hecho && <span className="size-2 rounded-full bg-primary" />}
                        </span>
                        <span
                          className={cn(
                            "text-sm",
                            actual ? "font-semibold text-foreground" : hecho ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {paso.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </div>
    </PageEnter>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
