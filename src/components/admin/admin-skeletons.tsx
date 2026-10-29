import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonExit } from "@/components/page-transition";
import { cn } from "@/lib/utils";

// Esqueletos de los `loading.tsx` del panel admin -- mismo criterio que
// components/page-skeletons.tsx: copian la estructura de cada pantalla y los
// títulos fijos se muestran como texto real.

function AdminTitle({ title, subtitleWidth }: { title: string; subtitleWidth?: string }) {
  return (
    <div>
      <h1 className="font-heading text-xl font-semibold">{title}</h1>
      {subtitleWidth && <Skeleton className={cn("mt-2 h-4", subtitleWidth)} />}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

// Misma caja que `Table` (components/ui/table.tsx): borde, encabezado
// gris y filas con divisor.
function TableSkeleton({ columns, rows = 8 }: { columns: string[]; rows?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-border">
      <div className="flex gap-6 border-b border-border bg-muted/50 px-3 py-3">
        {columns.map((w, i) => (
          <Skeleton key={i} className={cn("h-3.5 bg-border/70", w)} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-6 border-b border-border bg-card px-3 py-3.5 last:border-b-0">
          {columns.map((w, i) => (
            <Skeleton key={i} className={cn("h-4", w, i === 0 && r % 2 === 1 && "opacity-80")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Resumen del negocio · Semio 360</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-9 w-full" />
        <Card className="py-0">
          <CardContent className="flex flex-col gap-0 p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-b-0">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
              <div className="mt-4 flex h-36 items-end gap-3 border-b border-border pb-0.5">
                {[45, 70, 30, 85, 55, 65].map((h, i) => (
                  <div key={i} className="flex h-full flex-1 items-end justify-center">
                    <Skeleton className="w-7 rounded-b-none" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
              <div className="mt-2 flex flex-col gap-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SkeletonExit>
  );
}

export function AdminMedicosSkeleton() {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-5">
        {/* items-start, no items-baseline como la pantalla real: el botón
            esqueleto no tiene texto y empujaba el título hacia abajo. */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <AdminTitle title="Médicos" subtitleWidth="w-56" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-full sm:w-64" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
        <TableSkeleton columns={["w-44", "w-16", "w-20", "w-20", "w-20", "w-24", "ml-auto w-6"]} />
      </div>
    </SkeletonExit>
  );
}

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-14" />
      </CardContent>
    </Card>
  );
}

export function AdminMedicoDetalleSkeleton() {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-5">
        <span className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="size-3.5" />
          Médicos
        </span>
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="size-13 rounded-full" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-56" />
              </div>
            </div>
            <Skeleton className="h-9 w-36" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="grid gap-5 lg:grid-cols-2">
          {[0, 1].map((card) => (
            <Card key={card}>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-4 w-40" />
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SkeletonExit>
  );
}

export function AdminCostosIASkeleton() {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <AdminTitle title="Costos IA" subtitleWidth="w-72" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-9 w-40" />
            </div>
            <Skeleton className="h-9 w-24" />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-heading text-sm font-semibold">Por médico</h2>
            <Skeleton className="h-3 w-40" />
          </div>
          <TableSkeleton columns={["w-40", "ml-auto w-14", "w-14", "w-16", "w-16", "w-16", "w-28"]} rows={6} />
        </div>
      </div>
    </SkeletonExit>
  );
}

export function AdminGastosSkeleton() {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <AdminTitle title="Gastos" subtitleWidth="w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <TableSkeleton columns={["w-56", "w-24", "ml-auto w-20", "w-14"]} />
      </div>
    </SkeletonExit>
  );
}

// Va dentro del layout de Marketing (título y pestañas ya visibles).
export function AdminBienvenidasSkeleton() {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-9 w-72 rounded-lg" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <TableSkeleton columns={["w-44", "w-28", "w-24", "w-20", "w-20", "ml-auto w-24"]} rows={6} />
      </div>
    </SkeletonExit>
  );
}
