import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectorioVista } from "@/components/marketing/directorio-vista";
import { JsonLd } from "@/components/seo/json-ld";
import { getDoctoresPublicos, getEspecialidadesConMedicos } from "@/lib/directorio";
import { directorioJsonLd, nombreDoctor } from "@/lib/seo";
import { ESPECIALIDAD_LABELS, especialidadDesdeSlug, especialidadPath } from "@/lib/especialidad";

// Mismo motivo que /directorio: el orden rota por día y cada tarjeta muestra
// el próximo turno libre.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ especialidad: string }>;
  searchParams: Promise<{ ciudad?: string; lat?: string; lng?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const especialidad = especialidadDesdeSlug((await params).especialidad);
  if (!especialidad) return {};
  const filtros = await searchParams;
  const label = ESPECIALIDAD_LABELS[especialidad];
  const path = especialidadPath(especialidad);

  // Sin médicos publicados la página no aporta nada (contenido "thin"): se
  // sigue sirviendo para que no sea un 404 si alguien la enlazó, pero no se
  // indexa. Con filtro de ciudad tampoco (variantes infinitas de la misma).
  const conMedicos = (await getEspecialidadesConMedicos()).some((e) => e.especialidad === especialidad);
  const indexable = conMedicos && !(filtros.ciudad || filtros.lat || filtros.lng);

  const title = `${label}: médicos y turnos online`;
  const description = `Especialistas en ${label} en Argentina con perfil verificado. Mirá coberturas, lugares de atención y reservá turno online.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, url: path, siteName: "Semio360", locale: "es_AR", type: "website", images: ["/opengraph-image"] },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

export default async function EspecialidadPage({ params, searchParams }: Props) {
  const especialidad = especialidadDesdeSlug((await params).especialidad);
  if (!especialidad) notFound();

  const filtros = await searchParams;
  const lat = filtros.lat ? Number(filtros.lat) : undefined;
  const lng = filtros.lng ? Number(filtros.lng) : undefined;

  const [doctores, especialidades] = await Promise.all([
    getDoctoresPublicos({ especialidad, lat, lng }),
    getEspecialidadesConMedicos(),
  ]);
  const label = ESPECIALIDAD_LABELS[especialidad];

  return (
    <>
      <JsonLd
        data={directorioJsonLd(
          doctores
            .filter((d) => d.publicSlug)
            .map((d) => ({ nombre: nombreDoctor(d), path: `/directorio/${encodeURIComponent(d.publicSlug!)}` })),
          especialidad
        )}
      />
      <DirectorioVista
        kicker="Directorio Semio360"
        titulo={`Especialistas en ${label}`}
        descripcion={`Profesionales de ${label} con perfil verificado: mirá sus coberturas y lugares de atención, y reservá turno online cuando esté disponible.`}
        doctores={doctores}
        especialidades={especialidades}
        especialidadActual={especialidad}
      />
    </>
  );
}
