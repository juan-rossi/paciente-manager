import type { RawData, WebSocket } from "ws";
import type { AsrEngine } from "../asr/engine.js";
import { TranscriptionSession } from "../asr/chunking.js";
import { logger } from "../logger.js";

type OutgoingMessage =
  | { type: "partial"; text: string }
  | { type: "final"; text: string; speaker: null }
  | { type: "error"; message: string };

function send(ws: WebSocket, message: OutgoingMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Copiamos a un buffer propio y alineado: los frames que llegan por WebSocket no
// garantizan que byteOffset sea múltiplo de 2, lo cual rompería la vista Int16Array.
function toInt16(buffer: Buffer): Int16Array {
  const aligned = Buffer.alloc(buffer.length);
  buffer.copy(aligned);
  return new Int16Array(aligned.buffer, aligned.byteOffset, Math.floor(aligned.length / 2));
}

export function handleConnection(ws: WebSocket, engine: AsrEngine): void {
  const session = new TranscriptionSession(engine, {
    onPartial: (text) => send(ws, { type: "partial", text }),
    onFinal: (text) => send(ws, { type: "final", text, speaker: null }),
    onError: (error) => {
      logger.error(`Error de transcripción: ${error.message}`);
      send(ws, { type: "error", message: "Error interno del transcriptor." });
    },
  });
  session.start();

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      if (Buffer.isBuffer(data)) session.pushAudio(toInt16(data));
      return;
    }
    // Mensaje de control en texto (el cliente manda {"type":"stop"} antes de
    // cerrar). Si esperáramos al evento "close" para hacer la transcripción
    // final, el socket ya estaría cerrado cuando termine (puede tardar varios
    // segundos sin GPU) y `send()` la descartaría en silencio — por eso el
    // flujo normal de detener la grabación pasa por acá, con el socket
    // todavía abierto, y es el propio servidor el que cierra al terminar.
    void handleStopSignal(data, ws, session);
  });

  ws.on("close", () => {
    void session.stop();
  });

  ws.on("error", (error) => {
    logger.warn(`Conexión WebSocket con error: ${error.message}`);
  });
}

async function handleStopSignal(data: RawData, ws: WebSocket, session: TranscriptionSession): Promise<void> {
  if (!Buffer.isBuffer(data)) return;
  let message: unknown;
  try {
    message = JSON.parse(data.toString("utf-8"));
  } catch {
    return;
  }
  if ((message as { type?: string })?.type !== "stop") return;

  await session.stop();
  if (ws.readyState === ws.OPEN) ws.close();
}
