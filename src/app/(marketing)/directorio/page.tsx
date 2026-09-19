import { SectionHeading } from "@/components/marketing/section-heading";
import { DirectorioFiltros } from "@/components/marketing/directorio-filtros";
import { DoctorCard } from "@/components/marketing/doctor-card";
import { getDoctoresPublicos } from "@/lib/directorio";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ especialidad?: string; ciudad?: string; lat?: string; lng?: string }>;
};

export default async function DirectorioPage({ searchParams }: Props) {
  const params = await searchParams;
  const especialidad = params.especialidad || undefined;
  const lat = params.lat ? Number(params.lat) : undefined;
  const lng = params.lng ? Number(params.lng) : undefined;

  const doctores = await getDoctoresPublicos({ especialidad, lat, lng });

  return (
    <>
      <section className="relative overflow-hidden pt-16 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(55% 60% at 50% 0%, color-mix(in oklch, var(--primary) 16%, transparent), transparent)",
          }}
        />
        <div className="mx-auto max-w-2xl px-4 pb-14">
          <SectionHeading
            kicker="Directorio Semio360"
            title="El médico que buscás, a un clic de distancia"
            description="Explorá perfiles verificados, filtrá por especialidad y ciudad, y reservá turno online cuando esté disponible."
          />
          <DirectorioFiltros />
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          {doctores.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              No encontramos médicos con esos filtros. Probá con otra especialidad o ciudad.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {doctores.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
