import type { MetadataRoute } from "next";
import { getEspecialidadesConMedicos, getSlugsPerfilesPublicos } from "@/lib/directorio";
import { especialidadPath } from "@/lib/especialidad";
import { absoluteUrl, esProduccion } from "@/lib/site-url";

// Se regenera cada hora como red de seguridad; además, publicar o sacar un
// perfil lo invalida al instante (ver `src/lib/indexacion.ts`).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!esProduccion()) return [];

  // Si la base no responde (p. ej. durante el build) se publica igual el resto.
  const [perfiles, especialidades] = await Promise.all([
    getSlugsPerfilesPublicos().catch(() => []),
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
    // `lastModified` (la fecha de publicación) es lo único de cada entrada que
    // Google usa para priorizar el rastreo: ignora changefreq y priority.
    ...perfiles.map(({ slug, publicadoAt }) => ({
      url: absoluteUrl(`/directorio/${encodeURIComponent(slug)}`),
      lastModified: publicadoAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    { url: absoluteUrl("/terminos"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
