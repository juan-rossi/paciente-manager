import type { MetadataRoute } from "next";
import { getEspecialidadesConMedicos, getSlugsPerfilesPublicos } from "@/lib/directorio";
import { especialidadPath } from "@/lib/especialidad";
import { absoluteUrl, esProduccion } from "@/lib/site-url";

// Se regenera cada hora: los perfiles nuevos aparecen sin redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!esProduccion()) return [];

  // Si la base no responde (p. ej. durante el build) se publica igual el resto.
  const [slugs, especialidades] = await Promise.all([
    getSlugsPerfilesPublicos().catch(() => [] as string[]),
    getEspecialidadesConMedicos().catch(() => []),
  ]);

  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/directorio"), changeFrequency: "daily", priority: 0.9 },
    // Solo las que tienen médicos publicados: una página vacía no se indexa.
    ...especialidades.map(({ especialidad }) => ({
      url: absoluteUrl(especialidadPath(especialidad)),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...slugs.map((slug) => ({
      url: absoluteUrl(`/directorio/${encodeURIComponent(slug)}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    { url: absoluteUrl("/terminos"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
