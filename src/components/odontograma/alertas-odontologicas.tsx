import { AlertTriangle } from "lucide-react";

// Antecedentes que cambian la atención odontológica (ver
// alertasOdontologicas() en patient-form/constants.ts). Va arriba de la ficha
// y del odontograma, para verlo antes de anestesiar o extraer. Sin alertas no
// renderiza nada.
export function AlertasOdontologicas({ alertas }: { alertas: readonly string[] }) {
  if (alertas.length === 0) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p className="leading-relaxed">
        <span className="font-semibold">Antes de atender: </span>
        {alertas.join(" · ")}
      </p>
    </div>
  );
}
