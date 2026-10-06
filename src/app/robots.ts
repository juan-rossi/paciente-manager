import type { MetadataRoute } from "next";
import { esProduccion, getSiteUrl } from "@/lib/site-url";

// Bots de buscadores de IA y de entrenamiento: se permiten explícitamente en
// las rutas públicas para que el sitio pueda citarse en sus respuestas.
const BOTS_IA = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

const PRIVADAS = [
  "/api/",
  "/admin",
  "/dashboard",
  "/turnos",
  "/patients",
  "/configuracion",
  "/recordatorios",
  "/onboarding",
  "/cuenta-inactiva",
  "/login",
  "/signup",
];

export default function robots(): MetadataRoute.Robots {
  // QA, previews y local no se indexan.
  if (!esProduccion()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      // `/api/directorio/` sirve las fotos de perfil: tiene que poder rastrearse.
      { userAgent: "*", allow: ["/", "/api/directorio/"], disallow: PRIVADAS },
      { userAgent: BOTS_IA, allow: ["/", "/api/directorio/"], disallow: PRIVADAS },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
    host: getSiteUrl(),
  };
}
