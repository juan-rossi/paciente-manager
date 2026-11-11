import Link from "next/link";
import { MessageSquareHeart } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatFechaTicket, TIPO_LABELS } from "@/lib/soporte";
import { EstadoTicketPill } from "@/components/soporte/estado-ticket-pill";
import { NuevoTicketBotones } from "@/components/soporte/nuevo-ticket-botones";
import { PageEnter } from "@/components/page-transition";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SoportePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const tickets = await prisma.ticketSoporte.findMany({
    where: { autorId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      tipo: true,
      estado: true,
      asunto: true,
      noLeidoAutor: true,
      updatedAt: true,
      _count: { select: { mensajes: { where: { interno: false } } } },
    },
  });

  return (
    <PageEnter>
      {/* Mismo ancho que el resto de la app: lista a la izquierda, saludo y
          botones al costado (arriba en mobile). */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <aside className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 lg:sticky lg:top-6 lg:order-last">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquareHeart className="size-5" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h1 className="font-heading text-lg font-semibold">Sugerencias y soporte</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Que estés conforme con Semio 360 es lo más importante para nosotros. Contanos qué te falta, qué
                cambiarías o qué no está funcionando: leemos cada mensaje y te respondemos por acá.
              </p>
            </div>
          </div>
          <NuevoTicketBotones className="lg:flex-col lg:[&>button]:w-full" />
        </aside>

        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="font-heading text-xl font-semibold">Mis mensajes</h2>
          {tickets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-5 py-14 text-center">
              <p className="text-sm font-medium">Todavía no nos escribiste</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tus sugerencias y reportes, con nuestras respuestas, van a aparecer acá.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="hidden grid-cols-[minmax(0,1fr)_120px_120px_130px] gap-4 border-b border-border px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:grid">
                <span>Asunto</span>
                <span>Tipo</span>
                <span>Estado</span>
                <span>Actualizado</span>
              </div>
              <ul className="flex flex-col">
                {tickets.map((t) => (
                  <li key={t.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/soporte/${t.id}`}
                      className={cn(
                        "flex flex-col gap-1.5 px-4 py-3.5 transition-colors hover:bg-muted sm:grid sm:grid-cols-[minmax(0,1fr)_120px_120px_130px] sm:items-center sm:gap-4",
                        t.noLeidoAutor && "bg-primary/5"
                      )}
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          {t.noLeidoAutor && (
                            <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Respuesta nueva" />
                          )}
                          <span className={cn("truncate text-sm", t.noLeidoAutor ? "font-semibold" : "font-medium")}>
                            {t.asunto}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t.noLeidoAutor && <span className="font-semibold text-primary">Te respondimos · </span>}
                          {t._count.mensajes} {t._count.mensajes === 1 ? "mensaje" : "mensajes"}
                          <span className="sm:hidden">
                            {" "}
                            · {TIPO_LABELS[t.tipo]} · {formatFechaTicket(t.updatedAt)}
                          </span>
                        </span>
                      </span>
                      <span className="hidden text-sm text-muted-foreground sm:block">{TIPO_LABELS[t.tipo]}</span>
                      <span>
                        <EstadoTicketPill estado={t.estado} />
                      </span>
                      <span className="hidden text-sm text-muted-foreground tabular-nums sm:block">
                        {formatFechaTicket(t.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </PageEnter>
  );
}
