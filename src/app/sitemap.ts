import type { MetadataRoute } from "next";
import { getSlugsPerfilesPublicos } from "@/lib/directorio";
import { absoluteUrl, esProduccion } from "@/lib/site-url";

// Se regenera cada hora: los perfiles nuevos aparecen sin redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!esProduccion()) return [];

  // Si la base no responde (p. ej. durante el build) se publica igual el resto.
  const slugs = await getSlugsPerfilesPublicos().catch(() => [] as string[]);

  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/directorio"), changeFrequency: "daily", priority: 0.9 },
    ...slugs.map((slug) => ({
      url: absoluteUrl(`/directorio/${encodeURIComponent(slug)}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    { url: absoluteUrl("/terminos"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
