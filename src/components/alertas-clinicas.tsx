import { AlertTriangle } from "lucide-react";

// Antecedentes críticos del paciente según el grupo del profesional (ver
// alertasClinicas() en patient-form/constants.ts): en odontología, lo que hay
// que ver antes de anestesiar o extraer; en pediatría, antes de indicar un
// medicamento. Va arriba de la ficha (y del odontograma). Sin alertas no
// renderiza nada.
//
// Ámbar y no rojo: es un recordatorio permanente que se ve en cada consulta,
// no una urgencia. El rojo queda para lo que sí lo es (riesgo alto en salud
// mental). El texto va en el color normal; el ámbar, solo en el ícono y el
// rótulo.
export function AlertasClinicas({ alertas }: { alertas: readonly string[] }) {
  if (alertas.length === 0) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-foreground"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="leading-relaxed">
        <span className="font-semibold text-amber-800 dark:text-amber-300">Antes de atender: </span>
        {alertas.join(" · ")}
      </p>
    </div>
  );
}
