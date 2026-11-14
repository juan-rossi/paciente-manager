import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { DirectorioVista } from "@/components/marketing/directorio-vista";
import { JsonLd } from "@/components/seo/json-ld";
import { getDoctoresPublicos, getEspecialidadesConMedicos } from "@/lib/directorio";
import { directorioJsonLd, nombreDoctor } from "@/lib/seo";
import { esEspecialidad, especialidadPath } from "@/lib/especialidad";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ especialidad?: string; ciudad?: string; lat?: string; lng?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const filtrado = !!(params.ciudad || params.lat || params.lng);
  const title = "Directorio de médicos: encontrá tu especialista";
  const description =
    "Directorio de médicos con perfil verificado en Argentina. Filtrá por especialidad y ciudad, mirá coberturas y reservá turno online.";
  return {
    title,
    description,
    // Las vistas filtradas por ciudad son combinaciones infinitas de la misma
    // lista: se consolidan en /directorio y no se indexan. Las indexables por
    // especialidad viven en /directorio/especialidad/[especialidad].
    alternates: { canonical: "/directorio" },
    ...(filtrado ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: "/directorio", siteName: "Semio360", locale: "es_AR", type: "website", images: ["/opengraph-image"] },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

export default async function DirectorioPage({ searchParams }: Props) {
  const params = await searchParams;

  // URL vieja (`?especialidad=CARDIOLOGIA`, ya enlazada e indexada): 301 a la
  // página de la especialidad, conservando el filtro por ciudad.
  if (params.especialidad && esEspecialidad(params.especialidad)) {
    const resto = new URLSearchParams();
    if (params.ciudad) resto.set("ciudad", params.ciudad);
    if (params.lat) resto.set("lat", params.lat);
    if (params.lng) resto.set("lng", params.lng);
    const qs = resto.toString();
    permanentRedirect(`${especialidadPath(params.especialidad)}${qs ? `?${qs}` : ""}`);
  }

  const lat = params.lat ? Number(params.lat) : undefined;
  const lng = params.lng ? Number(params.lng) : undefined;

  const [doctores, especialidades] = await Promise.all([
    getDoctoresPublicos({ lat, lng }),
    getEspecialidadesConMedicos(),
  ]);

  return (
    <>
      <JsonLd
        data={directorioJsonLd(
          doctores
            .filter((d) => d.publicSlug)
            .map((d) => ({ nombre: nombreDoctor(d), path: `/directorio/${encodeURIComponent(d.publicSlug!)}` }))
        )}
      />
      <DirectorioVista
        kicker="Directorio Semio360"
        titulo="El médico que buscás, a un clic de distancia"
        descripcion="Explorá perfiles verificados, filtrá por especialidad y ciudad, y reservá turno online cuando esté disponible."
        doctores={doctores}
        especialidades={especialidades}
      />
    </>
  );
}
