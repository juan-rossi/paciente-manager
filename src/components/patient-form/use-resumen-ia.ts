import { useCallback, useState } from "react";

export type TipoResumen = "antecedentes" | "evolucion";

export const TITULO_YA_RESUMIDO =
  "Ya está resumido. Dictá más o editá el texto original para volver a resumir.";

/**
 * Pide a `/api/ia/resumir` un resumen del texto dictado.
 *
 * Recuerda el último texto resumido con éxito: volver a resumir la misma fuente
 * gasta tokens para un resultado casi igual (y pisa las correcciones manuales
 * del resumen), así que `yaResumido(fuente)` permite deshabilitar el botón
 * hasta que haya algo nuevo. `fuenteInicial` / `marcarResumido` cubren el caso
 * de un registro guardado que ya trae su dictado resumido.
 */
export function useResumenIA(tipo: TipoResumen, fuenteInicial = "") {
  const [resumiendo, setResumiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimaFuente, setUltimaFuente] = useState(fuenteInicial.trim());

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
        setUltimaFuente(texto.trim());
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

  const yaResumido = useCallback(
    (fuente: string) => Boolean(ultimaFuente) && fuente.trim() === ultimaFuente,
    [ultimaFuente]
  );

  const marcarResumido = useCallback((fuente: string) => setUltimaFuente(fuente.trim()), []);

  return {
    resumir,
    resumiendo,
    error,
    limpiarError: () => setError(null),
    yaResumido,
    marcarResumido,
  };
}
