import { AlertTriangle } from "lucide-react";

// Antecedentes críticos del paciente según el grupo del profesional (ver
// alertasClinicas() en patient-form/constants.ts): en odontología, lo que hay
// que ver antes de anestesiar o extraer; en pediatría, antes de indicar un
// medicamento. Va arriba de la ficha (y del odontograma). Sin alertas no
// renderiza nada.
export function AlertasClinicas({ alertas }: { alertas: readonly string[] }) {
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
