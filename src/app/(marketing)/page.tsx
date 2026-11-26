import type { Metadata } from "next";
import { teleconsultaHabilitada } from "@/lib/feature-flags";
import { Hero } from "@/components/marketing/hero";
import { ScrollToHash } from "@/components/marketing/scroll-to-hash";
import { DirectorioBanner } from "@/components/marketing/directorio-banner";
import { ConceptOrbit } from "@/components/marketing/concept-orbit";
import { ScrollStory } from "@/components/marketing/scroll-story";
import { Features } from "@/components/marketing/features";
import { LessAdmin } from "@/components/marketing/less-admin";
import { InteractiveDemo } from "@/components/marketing/interactive-demo";
import { Migracion } from "@/components/marketing/migracion";
import { TrustSecurity } from "@/components/marketing/trust-security";
import { Testimonials } from "@/components/marketing/testimonials";
import { Pricing } from "@/components/marketing/pricing";
import { FAQ } from "@/components/marketing/faq";
import { FinalCTA } from "@/components/marketing/final-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { homeJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    // ≤ 60 caracteres (~580px): más largo, Google y los auditores SEO lo cortan.
    absolute: "Semio360: software para profesionales de la salud",
  },
  // ≤ 155 caracteres por el mismo motivo.
  description:
    "Semio 360: software para profesionales de la salud en Argentina con turnos, historia clínica electrónica y dictado por voz. Probalo gratis, sin tarjeta.",
  keywords: [
    "Semio360",
    "Semio 360",
    "software para profesionales de la salud",
    "software para consultorio médico",
    "software para odontólogos",
    "software para psicólogos",
    "historia clínica electrónica",
    "sistema de turnos para profesionales de la salud",
    "gestión de pacientes",
    "Ley 26.529",
    "transcripción de consultas",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Semio360 — Tu consultorio. Más simple. Más conectado.",
    description:
      "Gestioná turnos, pacientes e historias clínicas desde un solo lugar, con dictado por voz y cumplimiento de la Ley 26.529.",
    url: "/",
    siteName: "Semio360",
    locale: "es_AR",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
    title: "Semio360 — Tu consultorio. Más simple. Más conectado.",
    description: "Gestioná turnos, pacientes e historias clínicas desde un solo lugar.",
  },
};

// Página estática (servida desde el CDN): el redirect de usuarios con sesión
// ya lo hace `src/proxy.ts` antes de llegar acá, así que no hace falta leer la
// sesión ni ir a la base en cada visita -- mejora TTFB/LCP (Core Web Vitals).
export default function MarketingHomePage() {
  return (
    <>
      <JsonLd data={homeJsonLd()} />
      <ScrollToHash />
      <Hero />
      <ConceptOrbit />
      <ScrollStory />
      <Features teleconsultaDisponible={teleconsultaHabilitada()} />
      <LessAdmin />
      <InteractiveDemo />
      <Migracion />
      <TrustSecurity />
      <Testimonials />
      <DirectorioBanner />
      <Pricing teleconsultaDisponible={teleconsultaHabilitada()} />
      <FAQ />
      <FinalCTA />
    </>
  );
}
