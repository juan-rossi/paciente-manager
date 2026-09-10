import { useCallback, useEffect, useState } from "react";

export const TRANSCRIBER_URL = process.env.NEXT_PUBLIC_TRANSCRIBER_URL ?? "http://127.0.0.1:7891";

export type ConnectionStatus = "verificando" | "disponible" | "no_disponible";

async function fetchConnectionStatus(): Promise<ConnectionStatus> {
  try {
    const response = await fetch(`${TRANSCRIBER_URL}/health`, { cache: "no-store" });
    if (!response.ok) throw new Error("health no-ok");
    const data = (await response.json()) as { status?: string };
    return data.status === "error" ? "no_disponible" : "disponible";
  } catch {
    return "no_disponible";
  }
}

// Chequeo de conectividad del transcriptor local, compartido entre el
// indicador de Configuración y el flujo de grabación en Evolución clínica
// (`use-transcription.ts`) -- ambos necesitan saber lo mismo (¿está corriendo
// el servicio en 127.0.0.1?) sin duplicar el fetch a `/health`.
export function useTranscriberConnection() {
  const [status, setStatus] = useState<ConnectionStatus>("verificando");

  const check = useCallback(() => {
    void fetchConnectionStatus().then(setStatus);
  }, []);

  // Patrón "ignore flag" recomendado por React para data fetching en efectos:
  // si el componente se desmonta (o el efecto se re-ejecuta) antes de que
  // resuelva el fetch, no actualizamos un estado que ya nadie va a leer.
  useEffect(() => {
    let ignore = false;
    fetchConnectionStatus().then((result) => {
      if (!ignore) setStatus(result);
    });
    return () => {
      ignore = true;
    };
  }, []);

  return { status, reintentar: check };
}
