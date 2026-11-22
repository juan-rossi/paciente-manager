import { Download, FileText, ShieldCheck, ShieldOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { verificarAdminEnPagina } from "@/lib/admin-page";
import { accesoVigente, archivosVencenEl } from "@/lib/importacion";
import { nombreConTitulo } from "@/lib/marketing-bienvenidas-texto";
import { ImportacionCargadaForm } from "@/components/admin/importacion-cargada-form";
import { PageEnter } from "@/components/page-transition";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ESTADO_LABEL = {
  ENVIADA: "Esperando carga",
  CARGADA: "Esperando que el médico confirme",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada por el médico",
  VENCIDA: "Vencida (archivos borrados)",
} as const;

function formatFechaHora(fecha: Date) {
  return fecha.toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}

// Importaciones de HC que piden los médicos (Acuerdo de tratamiento de datos,
// punto 3). Los archivos solo se pueden descargar mientras el médico tenga el
// permiso vigente, y cada descarga queda registrada en su cuenta: bajar solo
// lo necesario y no guardar copias fuera de la plataforma.
export default async function AdminImportacionesPage() {
  await verificarAdminEnPagina();

  const importaciones = await prisma.importacionHC.findMany({
    where: { estado: { not: "BORRADOR" } },
    orderBy: [{ enviadaAt: "desc" }],
    take: 100,
    select: {
      id: true,
      estado: true,
      nota: true,
      createdAt: true,
      enviadaAt: true,
      accesoHasta: true,
      cargadaAt: true,
      confirmadaAt: true,
      doctor: { select: { tituloCortesia: true, nombre: true, apellido: true, email: true } },
      archivos: {
        orderBy: { createdAt: "asc" },
        select: { id: true, nombre: true, tamano: true },
      },
    },
  });

  const pendientes = importaciones.filter((i) => i.estado === "ENVIADA");
  const resto = importaciones.filter((i) => i.estado !== "ENVIADA");
  const ahora = new Date();

  return (
    <PageEnter>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Importaciones de historias clínicas</h1>
          <p className="text-sm text-muted-foreground">
            Cada descarga queda registrada y el médico la ve. Bajá los archivos solo para cargarlos, no guardes
            copias fuera de la plataforma, y marcá la carga como terminada apenas esté lista: eso los borra.
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Esperando carga ({pendientes.length})</h2>
          {pendientes.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No hay importaciones pendientes.
            </p>
          )}
          {pendientes.map((imp) => {
            const medico = nombreConTitulo(imp.doctor);
            const vigente = accesoVigente(imp.accesoHasta, ahora);
            return (
              <article key={imp.id} className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{medico}</span>
                    <span className="text-xs text-muted-foreground">
                      {imp.doctor.email} · enviada el {formatFechaHora(imp.enviadaAt ?? imp.createdAt)}
                    </span>
                  </div>
                  <ImportacionCargadaForm importacionId={imp.id} medico={medico} />
                </div>

                {imp.nota && (
                  <p className="rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-line">{imp.nota}</p>
                )}

                <div
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-3 text-sm",
                    vigente ? "border-primary/30 bg-primary/5" : "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                  )}
                >
                  {vigente ? (
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <ShieldOff className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
                  )}
                  <span>
                    {vigente
                      ? `Permiso vigente hasta el ${formatFechaHora(imp.accesoHasta!)}.`
                      : "Sin permiso: el médico lo quitó o venció. Pedile por Soporte que lo renueve desde Configuración > Mis datos."}{" "}
                    <span className="text-muted-foreground">
                      Los archivos se borran solos el {formatFechaHora(archivosVencenEl(imp.createdAt))}.
                    </span>
                  </span>
                </div>

                <ul className="flex flex-col divide-y divide-border/60 rounded-lg border border-border/60">
                  {imp.archivos.map((archivo) => (
                    <li key={archivo.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{archivo.nombre}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {formatTamano(archivo.tamano)}
                      </span>
                      {vigente && (
                        <a
                          href={`/api/admin/importaciones/${imp.id}/archivos/${archivo.id}`}
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Download className="size-3.5" />
                          Descargar
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        {resto.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Anteriores</h2>
            <ul className="flex flex-col divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
              {resto.map((imp) => (
                <li key={imp.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span className="font-medium">{nombreConTitulo(imp.doctor)}</span>
                  <span className="text-xs text-muted-foreground">
                    {ESTADO_LABEL[imp.estado as keyof typeof ESTADO_LABEL]} ·{" "}
                    {formatFechaHora(imp.confirmadaAt ?? imp.cargadaAt ?? imp.enviadaAt ?? imp.createdAt)} ·{" "}
                    {imp.archivos.length} {imp.archivos.length === 1 ? "archivo" : "archivos"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageEnter>
  );
}
