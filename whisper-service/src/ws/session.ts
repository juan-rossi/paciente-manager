import type { WebSocket } from "ws";
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
    if (!isBinary || !Buffer.isBuffer(data)) return;
    session.pushAudio(toInt16(data));
  });

  ws.on("close", () => {
    void session.stop();
  });

  ws.on("error", (error) => {
    logger.warn(`Conexión WebSocket con error: ${error.message}`);
  });
}
