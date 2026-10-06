import type { Metadata } from "next";
import { TerminosContenido } from "@/components/legal/terminos-contenido";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso de Semio360.",
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
      <h1 className="font-heading mb-6 text-3xl font-bold">Términos y condiciones de uso</h1>
      <TerminosContenido />
    </div>
  );
}
