import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/turnos", "/patients", "/configuracion", "/recordatorios", "/onboarding"],
      },
    ],
    sitemap: "https://semio360.com/sitemap.xml",
  };
}
