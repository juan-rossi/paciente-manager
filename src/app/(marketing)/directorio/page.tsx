import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { DirectorioFiltros } from "@/components/marketing/directorio-filtros";
import { DoctorCard } from "@/components/marketing/doctor-card";
import { JsonLd } from "@/components/seo/json-ld";
import { getDoctoresPublicos } from "@/lib/directorio";
import { directorioJsonLd, nombreDoctor } from "@/lib/seo";
import { ESPECIALIDAD_LABELS, type Especialidad } from "@/lib/especialidad";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ especialidad?: string; ciudad?: string; lat?: string; lng?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const filtrado = !!(params.especialidad || params.ciudad || params.lat || params.lng);
  const esp = params.especialidad ? ESPECIALIDAD_LABELS[params.especialidad as Especialidad] : undefined;
  const title = esp ? `${esp}: médicos y turnos online` : "Directorio de médicos: encontrá tu especialista";
  const description = esp
    ? `Médicos de ${esp} en Argentina. Mirá perfiles, coberturas y lugares de atención, y reservá turno online.`
    : "Directorio de médicos con perfil verificado en Argentina. Filtrá por especialidad y ciudad, mirá coberturas y reservá turno online.";
  return {
    title,
    description,
    // Las vistas filtradas son combinaciones infinitas de la misma lista:
    // se consolidan en /directorio y no se indexan.
    alternates: { canonical: "/directorio" },
    ...(filtrado ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: "/directorio", siteName: "Semio360", locale: "es_AR", type: "website", images: ["/opengraph-image"] },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

export default async function DirectorioPage({ searchParams }: Props) {
  const params = await searchParams;
  const especialidad = params.especialidad || undefined;
  const lat = params.lat ? Number(params.lat) : undefined;
  const lng = params.lng ? Number(params.lng) : undefined;

  const doctores = await getDoctoresPublicos({ especialidad, lat, lng });

  return (
    <>
      <JsonLd
        data={directorioJsonLd(
          doctores
            .filter((d) => d.publicSlug)
            .map((d) => ({ nombre: nombreDoctor(d), path: `/directorio/${encodeURIComponent(d.publicSlug!)}` }))
        )}
      />
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
            as="h1"
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
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {doctores.map((doctor) => (
                <li key={doctor.id} className="flex">
                  <DoctorCard doctor={doctor} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
