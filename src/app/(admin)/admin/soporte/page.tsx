import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ESTADOS_ABIERTOS, formatFechaTicket, resumirUserAgent, TIPO_LABELS } from "@/lib/soporte";
import { planLabelDe } from "@/lib/admin-metrics";
import { nombreConTitulo } from "@/lib/marketing-bienvenidas-texto";
import { EstadoTicketPill } from "@/components/soporte/estado-ticket-pill";
import { RefrescarAlMontar } from "@/components/soporte/refrescar-al-montar";
import { SoporteRespuesta } from "@/components/admin/soporte-respuesta";
import { CopiarTextoButton } from "@/components/admin/copiar-texto-button";
import { PageEnter } from "@/components/page-transition";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTROS = {
  abiertos: { label: "Abiertos", where: { estado: { in: ESTADOS_ABIERTOS } } },
  sin_leer: { label: "Sin leer", where: { noLeidoAdmin: true } },
  problemas: { label: "Problemas", where: { tipo: "PROBLEMA", estado: { in: ESTADOS_ABIERTOS } } },
  sugerencias: { label: "Sugerencias", where: { tipo: "SUGERENCIA", estado: { in: ESTADOS_ABIERTOS } } },
  cerrados: { label: "Cerrados", where: { estado: { in: ["RESUELTO", "DESCARTADO"] } } },
  todos: { label: "Todos", where: {} },
} satisfies Record<string, { label: string; where: Prisma.TicketSoporteWhereInput }>;
type Filtro = keyof typeof FILTROS;

const ROL_LABELS = { DOCTOR: "Médico/a", SECRETARY: "Secretaria/o", ADMIN: "Admin" } as const;

type SearchParams = Promise<{ f?: string; t?: string }>;

function hrefDe(filtro: Filtro, ticketId?: string) {
  const params = new URLSearchParams();
  if (filtro !== "abiertos") params.set("f", filtro);
  if (ticketId) params.set("t", ticketId);
  const qs = params.toString();
  return qs ? `/admin/soporte?${qs}` : "/admin/soporte";
}

export default async function AdminSoportePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filtro: Filtro = sp.f && sp.f in FILTROS ? (sp.f as Filtro) : "abiertos";

  const [tickets, conteos, seleccionado] = await Promise.all([
    prisma.ticketSoporte.findMany({
      where: FILTROS[filtro].where,
      orderBy: [{ noLeidoAdmin: "desc" }, { updatedAt: "desc" }],
      take: 200,
      select: {
        id: true,
        tipo: true,
        estado: true,
        asunto: true,
        noLeidoAdmin: true,
        updatedAt: true,
        autor: { select: { nombre: true, apellido: true, tituloCortesia: true, role: true } },
      },
    }),
    Promise.all(
      (Object.keys(FILTROS) as Filtro[]).map(
        async (f) => [f, await prisma.ticketSoporte.count({ where: FILTROS[f].where })] as const
      )
    ).then((pares) => Object.fromEntries(pares) as Record<Filtro, number>),
    sp.t
      ? prisma.ticketSoporte.findUnique({
          where: { id: sp.t },
          select: {
            id: true,
            tipo: true,
            estado: true,
            asunto: true,
            pantalla: true,
            userAgent: true,
            noLeidoAdmin: true,
            createdAt: true,
            updatedAt: true,
            autorId: true,
            autor: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                tituloCortesia: true,
                role: true,
                email: true,
                plan: true,
                planDuracion: true,
                planEndsAt: true,
                trialEndsAt: true,
              },
            },
            doctor: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                tituloCortesia: true,
                plan: true,
                planDuracion: true,
                planEndsAt: true,
                trialEndsAt: true,
              },
            },
            mensajes: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                esEquipo: true,
                interno: true,
                cuerpo: true,
                createdAt: true,
                autor: { select: { nombre: true } },
              },
            },
          },
        })
      : null,
  ]);

  const previos = seleccionado
    ? await prisma.ticketSoporte.count({ where: { autorId: seleccionado.autorId, id: { not: seleccionado.id } } })
    : 0;

  // Abrirlo lo marca leído para el equipo, sin tocar `updatedAt` (leer no
  // es actividad nueva y no tiene que reordenar la bandeja).
  if (seleccionado?.noLeidoAdmin) {
    await prisma.ticketSoporte.update({
      where: { id: seleccionado.id },
      data: { noLeidoAdmin: false, updatedAt: seleccionado.updatedAt },
    });
  }

  const cuentaPlan = seleccionado?.doctor ?? (seleccionado?.autor.role === "DOCTOR" ? seleccionado.autor : null);

  return (
    <PageEnter>
      <div className="flex flex-col gap-5">
        {seleccionado?.noLeidoAdmin && <RefrescarAlMontar />}
        <div>
          <h1 className="font-heading text-xl font-semibold">Soporte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sugerencias y reportes de problemas que mandan médicos y secretarias desde la app. Tus respuestas les
            llegan en Semio 360 y por email; las notas internas solo las ve el equipo.
          </p>
        </div>

        <nav aria-label="Filtros" className="flex flex-wrap gap-1.5">
          {(Object.keys(FILTROS) as Filtro[]).map((f) => (
            <Link
              key={f}
              href={hrefDe(f)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                f === filtro
                  ? "border-transparent bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {FILTROS[f].label}
              <span className="tabular-nums opacity-70">{conteos[f]}</span>
            </Link>
          ))}
        </nav>

        <div className="grid overflow-hidden rounded-xl border border-border bg-card lg:min-h-[560px] lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Lista -- en mobile se oculta cuando hay un ticket abierto. */}
          <div className={cn("min-w-0 border-border lg:border-r", seleccionado && "hidden lg:block")}>
            {tickets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
                <Inbox className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">No hay mensajes en esta vista</p>
                <p className="text-xs text-muted-foreground">Cuando alguien escriba desde la app, aparece acá.</p>
              </div>
            ) : (
              <ul className="flex max-h-[720px] flex-col overflow-y-auto">
                {tickets.map((t) => (
                  <li key={t.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={hrefDe(filtro, t.id)}
                      scroll={false}
                      className={cn(
                        "flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted",
                        t.id === seleccionado?.id && "bg-primary/10 hover:bg-primary/10"
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          {t.noLeidoAdmin && (
                            <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Sin leer" />
                          )}
                          <span className={cn("truncate text-sm", t.noLeidoAdmin ? "font-semibold" : "font-medium")}>
                            {t.asunto}
                          </span>
                        </span>
                        <EstadoTicketPill estado={t.estado} />
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        <TipoTag tipo={t.tipo} /> · {nombreConTitulo(t.autor)}
                        {t.autor.role === "SECRETARY" && " (secretaria/o)"} · {formatFechaTicket(t.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Conversación */}
          <div className={cn("min-w-0", !seleccionado && "hidden lg:flex")}>
            {!seleccionado ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-14 text-center">
                <p className="text-sm font-medium">Elegí un mensaje de la lista</p>
                <p className="text-xs text-muted-foreground">Ves la conversación, los datos de quien escribió y respondés desde acá.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="flex flex-col gap-3 border-b border-border px-5 py-4">
                  <Link
                    href={hrefDe(filtro)}
                    className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground lg:hidden"
                  >
                    <ArrowLeft className="size-3.5" />
                    Volver a la lista
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-semibold">{seleccionado.asunto}</h2>
                    <EstadoTicketPill estado={seleccionado.estado} />
                  </div>
                  {/* Primero quién escribió; el contexto técnico va en chips
                      que se acomodan al ancho, sin columnas fijas que corten
                      nombres o emails. */}
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {`${seleccionado.autor.nombre.charAt(0)}${seleccionado.autor.apellido.charAt(0)}`.toUpperCase()}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      {seleccionado.autor.role === "DOCTOR" ? (
                        <Link
                          href={`/admin/medicos/${seleccionado.autor.id}`}
                          className="w-fit text-sm font-semibold text-primary hover:underline"
                        >
                          {nombreConTitulo(seleccionado.autor)}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold">{nombreConTitulo(seleccionado.autor)}</span>
                      )}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{ROL_LABELS[seleccionado.autor.role]}</span>
                        {seleccionado.autor.role === "SECRETARY" && seleccionado.doctor && (
                          <>
                            <span aria-hidden>·</span>
                            <span>
                              de{" "}
                              <Link
                                href={`/admin/medicos/${seleccionado.doctor.id}`}
                                className="text-foreground hover:underline"
                              >
                                {nombreConTitulo(seleccionado.doctor)}
                              </Link>
                            </span>
                          </>
                        )}
                        {cuentaPlan && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{planLabelDe(cuentaPlan).label}</span>
                          </>
                        )}
                        <span aria-hidden>·</span>
                        <span className="break-all select-all">{seleccionado.autor.email}</span>
                        <CopiarTextoButton texto={seleccionado.autor.email} />
                      </div>
                    </div>
                  </div>
                  <ul className="flex flex-wrap gap-1.5" aria-label="Contexto del mensaje">
                    <Chip label="Tipo">{TIPO_LABELS[seleccionado.tipo]}</Chip>
                    {seleccionado.pantalla && (
                      <Chip label="Pantalla">
                        <span className="font-mono">{seleccionado.pantalla}</span>
                      </Chip>
                    )}
                    {seleccionado.userAgent && (
                      <Chip label="Dispositivo" title={seleccionado.userAgent}>
                        {resumirUserAgent(seleccionado.userAgent)}
                      </Chip>
                    )}
                    <Chip label="Historial">
                      {previos === 0
                        ? "Primer mensaje"
                        : previos === 1
                          ? "1 mensaje anterior"
                          : `${previos} mensajes anteriores`}
                    </Chip>
                  </ul>
                </div>

                <ol className="flex flex-col gap-3 px-5 py-5">
                  {seleccionado.mensajes.map((m) => (
                    <li
                      key={m.id}
                      className={cn(
                        "flex flex-col gap-1 rounded-xl px-4 py-3",
                        m.interno
                          ? "border border-amber-300/60 bg-amber-50 dark:border-amber-400/25 dark:bg-amber-400/10"
                          : m.esEquipo
                            ? "max-w-[85%] self-end border border-primary/20 bg-primary/5"
                            : "max-w-[85%] self-start bg-muted"
                      )}
                    >
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {m.interno
                          ? `Nota interna · ${m.autor.nombre}`
                          : m.esEquipo
                            ? `Equipo (${m.autor.nombre})`
                            : nombreConTitulo(seleccionado.autor)}{" "}
                        · {formatFechaTicket(m.createdAt)}
                      </span>
                      <p className="text-sm leading-relaxed break-words whitespace-pre-line">{m.cuerpo}</p>
                    </li>
                  ))}
                </ol>

                <div className="border-t border-border bg-muted/30 px-5 py-4">
                  <SoporteRespuesta
                    key={seleccionado.id}
                    ticketId={seleccionado.id}
                    estadoActual={seleccionado.estado}
                    nombreAutor={seleccionado.autor.nombre}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageEnter>
  );
}

function Chip({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) {
  return (
    <li
      title={title}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate">{children}</span>
    </li>
  );
}

function TipoTag({ tipo }: { tipo: keyof typeof TIPO_LABELS }) {
  return (
    <span
      className={cn(
        "font-semibold",
        tipo === "PROBLEMA" ? "text-destructive" : tipo === "SUGERENCIA" ? "text-primary" : "text-foreground"
      )}
    >
      {TIPO_LABELS[tipo]}
    </span>
  );
}
