import type { TranscriptionErrorKind } from "./use-cloud-transcription";

export function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function anexarTexto(prev: string, texto: string): string {
  return prev.trim() ? `${prev.trim()}\n${texto}` : texto;
}

export function mensajeErrorDictado(
  error: TranscriptionErrorKind | null,
  mensajeTopeIA: string | null
): string | null {
  switch (error) {
    case "tope_alcanzado":
      return mensajeTopeIA ?? "Alcanzaste el límite mensual de uso de las funciones de IA.";
    case "mic_denegado":
      return "No se pudo acceder al micrófono. Revisá los permisos del navegador para este sitio.";
    case "transcripcion_fallida":
      return "No se pudo transcribir el audio. Probá de nuevo.";
    case "sin_conexion":
      return "No hay conexión para transcribir el audio. Revisá tu internet y probá de nuevo.";
    default:
      return null;
  }
}
