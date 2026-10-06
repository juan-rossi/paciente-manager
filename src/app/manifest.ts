import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Semio360",
    short_name: "Semio360",
    description: "Turnos, historia clínica y evolución de tus pacientes en un solo lugar.",
    start_url: "/",
    display: "standalone",
    lang: "es-AR",
    background_color: "#ffffff",
    theme_color: "#1e3a8a",
    icons: [{ src: "/icon.png", type: "image/png", sizes: "any" }],
  };
}
