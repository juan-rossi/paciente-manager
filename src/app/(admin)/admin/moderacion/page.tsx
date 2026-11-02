import Link from "next/link";
import { ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ModeracionAcciones } from "@/components/admin/moderacion-acciones";
import { CATEGORIA_LABELS } from "@/lib/moderacion";
import { nombreConTitulo } from "@/lib/marketing-bienvenidas-texto";
import { PageEnter } from "@/components/page-transition";

// La cola cambia cada vez que un médico guarda su perfil -- sin cache.
export const dynamic = "force-dynamic";

const fechaFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function AdminModeracionPage() {
  const revisiones = await prisma.moderacionPerfil.findMany({
    where: { estado: "PENDIENTE" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      campo: true,
      contenido: true,
      motivo: true,
      categorias: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          tituloCortesia: true,
          publicSlug: true,
          biografiaPublica: true,
          fotoPublicaBase64: true,
        },
      },
    },
  });

  return (
    <PageEnter>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-xl font-semibold">Moderación</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cambios de foto o biografía del perfil público que no se publicaron solos. Hasta que
            decidas, el directorio sigue mostrando la versión anterior.
          </p>
        </div>

        {revisiones.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <ShieldCheck className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No hay cambios pendientes de revisión</p>
            <p className="text-xs text-muted-foreground">
              Los perfiles que la moderación automática marque aparecen acá.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {revisiones.map((r) => {
              const esFoto = r.campo === "FOTO";
              const anterior = esFoto ? r.user.fotoPublicaBase64 : r.user.biografiaPublica;
              return (
                <li key={r.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/medicos/${r.user.id}`}
                              className="font-heading font-semibold hover:underline"
                            >
                              {nombreConTitulo(r.user)}
                            </Link>
                            <Badge variant="secondary">{esFoto ? "Foto" : "Biografía"}</Badge>
                            {r.user.publicSlug && (
                              <a
                                href={`/directorio/${r.user.publicSlug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                Ver perfil <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {r.motivo === "MARCADO" ? (
                              r.categorias.map((c) => (
                                <Badge key={c} variant="destructive">
                                  {CATEGORIA_LABELS[c] ?? c}
                                </Badge>
                              ))
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                                <TriangleAlert className="size-3.5" />
                                La moderación automática no respondió
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              · {fechaFormatter.format(r.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <ModeracionAcciones id={r.id} updatedAt={r.updatedAt.toISOString()} />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Version titulo="Publicado ahora" esFoto={esFoto} contenido={anterior} />
                        <Version titulo="Cambio propuesto" esFoto={esFoto} contenido={r.contenido} destacada />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageEnter>
  );
}

function Version({
  titulo,
  esFoto,
  contenido,
  destacada = false,
}: {
  titulo: string;
  esFoto: boolean;
  contenido: string | null;
  destacada?: boolean;
}) {
  return (
    <div
      className={
        destacada
          ? "flex flex-col gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3"
          : "flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 p-3"
      }
    >
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {titulo}
      </span>
      {!contenido ? (
        <p className="text-sm text-muted-foreground italic">{esFoto ? "Sin foto" : "Sin biografía"}</p>
      ) : esFoto ? (
        <div className="flex size-48 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={contenido} alt={titulo} className="size-full object-contain" />
        </div>
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-line">{contenido}</p>
      )}
    </div>
  );
}
