import type { Metadata } from "next";
import { AcuerdoDatosContenido } from "@/components/legal/acuerdo-datos-contenido";

export const metadata: Metadata = {
  title: "Acuerdo de tratamiento de datos",
  description: "Cómo trata y protege Semio360 los datos de los pacientes de cada profesional.",
  alternates: { canonical: "/acuerdo-datos" },
};

export default function AcuerdoDatosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
      <h1 className="font-heading mb-6 text-3xl font-bold">Acuerdo de tratamiento de datos</h1>
      <AcuerdoDatosContenido />
    </div>
  );
}
