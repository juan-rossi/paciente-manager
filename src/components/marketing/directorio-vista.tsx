import Link from "next/link";
import { SectionHeading } from "@/components/marketing/section-heading";
import { DirectorioFiltros } from "@/components/marketing/directorio-filtros";
import { DoctorCard } from "@/components/marketing/doctor-card";
import type { DoctorPublico } from "@/lib/directorio";
import { ESPECIALIDAD_LABELS, especialidadPath, type Especialidad } from "@/lib/especialidad";
import { cn } from "@/lib/utils";

type Props = {
  kicker: string;
  titulo: string;
  descripcion: string;
  doctores: DoctorPublico[];
  // Especialidades con perfiles publicados, para los links internos.
  especialidades: { especialidad: Especialidad; cantidad: number }[];
  especialidadActual?: Especialidad;
};

// Cuerpo común de `/directorio` y `/directorio/especialidad/[especialidad]`.
export function DirectorioVista({ kicker, titulo, descripcion, doctores, especialidades, especialidadActual }: Props) {
  return (
    <>
      <section className="relative overflow-hidden pt-6 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(55% 60% at 50% 0%, color-mix(in oklch, var(--primary) 16%, transparent), transparent)",
          }}
        />
        <div className="mx-auto max-w-2xl px-4 pb-9 sm:pb-14">
          {especialidadActual && (
            <nav aria-label="Ruta" className="mb-4 flex justify-center gap-1.5 text-[13px] text-muted-foreground">
              <Link href="/directorio" className="transition-colors hover:text-primary hover:underline">
                Directorio
              </Link>
              <span aria-hidden>/</span>
              <span aria-current="page" className="font-semibold text-foreground">
                {ESPECIALIDAD_LABELS[especialidadActual]}
              </span>
            </nav>
          )}
          <SectionHeading as="h1" kicker={kicker} title={titulo} description={descripcion} />
          <DirectorioFiltros especialidadActual={especialidadActual} />
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/20 pt-9 pb-10 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          {doctores.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              No encontramos médicos con esos filtros. Probá con otra especialidad o ciudad.
            </p>
          ) : (
            // `grid-cols-1` (minmax(0, 1fr)) y `min-w-0`, no el track implícito:
            // un nombre largo sin cortes estiraba la columna más allá del
            // viewport en mobile y con ella toda la página.
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {doctores.map((doctor) => (
                <li key={doctor.id} className="flex min-w-0">
                  <DoctorCard doctor={doctor} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {especialidades.length > 0 && (
        <section aria-labelledby="directorio-especialidades" className="border-t border-border/60 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 id="directorio-especialidades" className="text-lg font-semibold tracking-tight text-foreground">
              Médicos por especialidad
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Elegí una especialidad para ver todos sus profesionales y reservar turno.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2.5">
              {especialidades.map(({ especialidad, cantidad }) => {
                const actual = especialidad === especialidadActual;
                return (
                  <li key={especialidad}>
                    <Link
                      href={especialidadPath(especialidad)}
                      aria-current={actual ? "page" : undefined}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                        actual
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-card text-foreground hover:border-primary/50 hover:text-primary"
                      )}
                    >
                      {ESPECIALIDAD_LABELS[especialidad]}
                      <span className={cn("text-xs tabular-nums", actual ? "opacity-80" : "text-muted-foreground")}>
                        {cantidad}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
