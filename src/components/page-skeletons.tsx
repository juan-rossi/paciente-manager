import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonExit } from "@/components/page-transition";
import { cn } from "@/lib/utils";

// Esqueletos de los `loading.tsx` de (app). Copian la estructura de cada
// pantalla (mismas columnas, tarjetas y alturas aproximadas) para que el
// contenido real aparezca en el mismo lugar y no "salte". Los títulos que no
// dependen de datos se muestran ya como texto real.

function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-semibold">{children}</h1>;
}

// Fila "Anterior · fecha · Siguiente" de turnos, dashboard y recordatorios.
function DayNavSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-9 sm:w-24" />
      <div className="flex flex-1 justify-center">
        <Skeleton className="h-5 w-40 sm:h-6 sm:w-64" />
      </div>
      <Skeleton className="h-8 w-9 sm:w-24" />
    </div>
  );
}

function RowSkeleton({ lead = "square", widths }: { lead?: "square" | "time"; widths: [string, string] }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
      <Skeleton className={cn("shrink-0", lead === "time" ? "h-9 w-14" : "size-9 rounded-[10px]")} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className={cn("h-3.5", widths[0])} />
        <Skeleton className={cn("h-3", widths[1])} />
      </div>
      <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
    </div>
  );
}

const ROW_WIDTHS: [string, string][] = [
  ["w-40", "w-56"],
  ["w-32", "w-48"],
  ["w-44", "w-36"],
  ["w-36", "w-52"],
];

export function DashboardSkeleton() {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-8 w-56 rounded-lg sm:h-9 sm:w-72" />
          <div className="flex items-center gap-3">
            <Skeleton className="hidden h-9 w-32 rounded-lg sm:block" />
            <Skeleton className="h-7 w-8 rounded-lg sm:h-9 sm:w-36" />
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-3">
            <DayNavSkeleton />
            <div className="flex flex-col gap-2">
              {ROW_WIDTHS.map((w, i) => (
                <RowSkeleton key={i} lead="time" widths={w} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SkeletonExit>
  );
}

export function TurnosSkeleton() {
  return (
    <SkeletonExit>
      <div className="flex flex-1 flex-col gap-6 lg:flex-row">
        <div className="flex flex-col gap-3 lg:w-[15.25rem] lg:self-start">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-5 w-40 lg:hidden" />
              <div className="hidden flex-col gap-4 py-1 lg:flex">
                <div className="flex items-center justify-between px-1">
                  <Skeleton className="size-6" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="size-6" />
                </div>
                <div className="grid grid-cols-7 gap-x-2 gap-y-3">
                  {Array.from({ length: 42 }, (_, i) => (
                    <Skeleton key={i} className={cn("h-6", i < 7 && "h-3.5")} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-5 gap-2 lg:flex lg:flex-col lg:gap-3">
            <Skeleton className="col-span-3 h-9 lg:w-full" />
            <Skeleton className="col-span-2 h-9 lg:w-full" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <DayNavSkeleton />
          <Card>
            <CardContent className="flex flex-col gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-border p-2">
                  <Skeleton className="h-9 w-14 shrink-0" />
                  <Skeleton className={cn("h-3.5", i % 3 === 0 ? "w-24" : i % 3 === 1 ? "w-44" : "w-36")} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </SkeletonExit>
  );
}

export function RecordatoriosSkeleton() {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-4">
        <PageTitle>Recordatorios</PageTitle>
        <DayNavSkeleton />
        <Card>
          <CardContent className="flex flex-col gap-2">
            {ROW_WIDTHS.map((w, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md border border-border p-2">
                <Skeleton className="h-9 w-14 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className={cn("h-3.5", w[0])} />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-9 sm:w-28" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </SkeletonExit>
  );
}

export function ConfiguracionSkeleton() {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-4">
        <PageTitle>Configuración</PageTitle>
        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-start md:gap-6">
          <Skeleton className="h-14 w-full rounded-xl md:hidden" />
          <div className="hidden w-56 shrink-0 flex-col gap-1.5 rounded-xl border border-border/60 bg-card p-2 md:flex">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className={cn("h-8", i === 0 && "mt-6")} />
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className={cn("h-8", i === 0 && "mt-6")} />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {[0, 1].map((card) => (
              <Card key={card}>
                <CardContent className="flex flex-col gap-4">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-3.5 w-full max-w-md" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Skeleton className="h-9" />
                    <Skeleton className="h-9" />
                    <Skeleton className="h-9" />
                    <Skeleton className="h-9" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </SkeletonExit>
  );
}

function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

// Misma caja que `FormSection` (patient-form/fields.tsx): franja de título
// con ícono arriba y el contenido debajo.
function SectionSkeleton({ titleWidth, children }: { titleWidth: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5 sm:px-5">
        <Skeleton className="size-6 bg-primary/10" />
        <Skeleton className={cn("h-4", titleWidth)} />
      </div>
      <div className="flex flex-col gap-4 bg-card p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function PatientSkeleton() {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="hidden h-8 w-44 sm:block" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <SectionSkeleton titleWidth="w-44">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <FieldSkeleton className="sm:col-span-4" />
                <FieldSkeleton className="sm:col-span-2" />
                <FieldSkeleton className="sm:col-span-3" />
                <FieldSkeleton className="sm:col-span-3" />
                <FieldSkeleton className="sm:col-span-6" />
                <FieldSkeleton className="sm:col-span-6" />
              </div>
            </SectionSkeleton>
            <SectionSkeleton titleWidth="w-28">
              <FieldSkeleton />
              <FieldSkeleton />
              <FieldSkeleton />
            </SectionSkeleton>
          </div>
          <div className="flex flex-col gap-6">
            <SectionSkeleton titleWidth="w-36">
              <FieldSkeleton />
              <FieldSkeleton />
            </SectionSkeleton>
            <SectionSkeleton titleWidth="w-36">
              <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </SectionSkeleton>
          </div>
        </div>
      </div>
    </SkeletonExit>
  );
}

// Formulario de paciente (alta y edición).
export function PatientFormSkeleton({ title }: { title?: string }) {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-4">
        {title ? <PageTitle>{title}</PageTitle> : <Skeleton className="h-8 w-64" />}
        <Skeleton className="h-9 w-full max-w-md rounded-lg" />
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </SkeletonExit>
  );
}

// Pantallas de texto/tabla sin una estructura propia (historia clínica,
// pacientes eliminados).
export function DocumentSkeleton({ title }: { title?: string }) {
  return (
    <SkeletonExit>
      <div className="flex flex-col gap-4">
        {title ? <PageTitle>{title}</PageTitle> : <Skeleton className="h-8 w-64" />}
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-3.5 w-full max-w-lg" />
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-t border-border pt-3">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3.5 w-1/4" />
                <Skeleton className="ml-auto h-7 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </SkeletonExit>
  );
}
