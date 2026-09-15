import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { Hero } from "@/components/marketing/hero";
import { SocialProof } from "@/components/marketing/social-proof";
import { ConceptOrbit } from "@/components/marketing/concept-orbit";
import { ScrollStory } from "@/components/marketing/scroll-story";
import { Features } from "@/components/marketing/features";
import { LessAdmin } from "@/components/marketing/less-admin";
import { InteractiveDemo } from "@/components/marketing/interactive-demo";
import { TrustSecurity } from "@/components/marketing/trust-security";
import { Testimonials } from "@/components/marketing/testimonials";
import { Pricing } from "@/components/marketing/pricing";
import { FAQ } from "@/components/marketing/faq";
import { FinalCTA } from "@/components/marketing/final-cta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Semio360 — Tu consultorio. Más simple. Más conectado." },
  description:
    "Gestioná turnos, pacientes e historias clínicas desde un solo lugar. Dictás la consulta y se transcribe sola. 3 meses de prueba gratis, sin tarjeta.",
  alternates: { canonical: "https://semio360.com" },
  openGraph: {
    title: "Semio360 — Tu consultorio. Más simple. Más conectado.",
    description:
      "Gestioná turnos, pacientes e historias clínicas desde un solo lugar, con dictado por voz y cumplimiento de la Ley 26.529.",
    url: "https://semio360.com",
    siteName: "Semio360",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Semio360 — Tu consultorio. Más simple. Más conectado.",
    description: "Gestioná turnos, pacientes e historias clínicas desde un solo lugar.",
  },
};

export default async function MarketingHomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "DOCTOR" ? "/dashboard" : "/turnos");
  }

  return (
    <>
      <Hero />
      <SocialProof />
      <ConceptOrbit />
      <ScrollStory />
      <Features />
      <LessAdmin />
      <InteractiveDemo />
      <TrustSecurity />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  );
}
