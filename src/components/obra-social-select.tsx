"use client";

import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PARTICULAR = "__particular__";

type Props = {
  // "" = Particular (se guarda como NULL).
  value: string;
  onChange: (value: string) => void;
  prepagas: string[];
  triggerClassName?: string;
  // Turno por videollamada: coberturas que el médico no acepta por
  // teleconsulta (Configuración > Coberturas). Si se elige una, se avisa,
  // pero no se bloquea: puede ser un acuerdo puntual o pasar a particular.
  sinTeleconsulta?: string[];
  // Quién está cargando el turno, para el texto del aviso.
  avisoPara?: "paciente" | "consultorio";
};

export function ObraSocialSelect({
  value,
  onChange,
  prepagas,
  triggerClassName,
  sinTeleconsulta = [],
  avisoPara = "consultorio",
}: Props) {
  // Un turno viejo puede traer un texto libre que ya no está entre las
  // prepagas del médico: se muestra igual para no pisarlo al editar.
  const opciones = value && !prepagas.includes(value) ? [value, ...prepagas] : prepagas;
  const noCubre = !!value && sinTeleconsulta.includes(value);
  return (
    <>
      <Select value={value || PARTICULAR} onValueChange={(v) => onChange(v === PARTICULAR ? "" : (v as string))}>
        <SelectTrigger className={cn("w-full", triggerClassName)}>
          <SelectValue>{(v: string) => (v === PARTICULAR ? "Particular" : v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={PARTICULAR}>Particular</SelectItem>
          {opciones.map((nombre) => (
            <SelectItem key={nombre} value={nombre}>
              {nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {noCubre && <AvisoSinTeleconsulta cobertura={value} para={avisoPara} />}
    </>
  );
}

export function AvisoSinTeleconsulta({
  cobertura,
  para,
}: {
  cobertura: string;
  para: "paciente" | "consultorio";
}) {
  return (
    <p
      role="status"
      className="flex gap-2 rounded-md bg-amber-50 px-2.5 py-2 text-xs leading-snug text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
    >
      <TriangleAlert className="mt-px size-3.5 shrink-0" />
      {para === "paciente"
        ? `Este profesional no atiende ${cobertura} por videollamada: la consulta sería particular.`
        : `${cobertura} no se acepta por teleconsulta. Podés agendarlo igual, por ejemplo como particular.`}
    </p>
  );
}
