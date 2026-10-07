import { useCallback, useState } from "react";

export type TipoResumen = "antecedentes" | "evolucion";

/** Pide a `/api/ia/resumir` un resumen del texto dictado. */
export function useResumenIA(tipo: TipoResumen) {
  const [resumiendo, setResumiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumir = useCallback(
    async (texto: string): Promise<string | null> => {
      setResumiendo(true);
      setError(null);
      try {
        const response = await fetch("/api/ia/resumir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto, tipo }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || typeof data?.resumen !== "string") {
          setError(data?.error ?? "No se pudo generar el resumen.");
          return null;
        }
        return data.resumen;
      } catch {
        setError("No se pudo conectar para generar el resumen.");
        return null;
      } finally {
        setResumiendo(false);
      }
    },
    [tipo]
  );

  return { resumir, resumiendo, error, limpiarError: () => setError(null) };
}
