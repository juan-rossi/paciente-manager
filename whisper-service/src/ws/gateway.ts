import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { AsrEngine } from "../asr/engine.js";
import { handleConnection } from "./session.js";
import { isOriginAllowed } from "../cors.js";
import { logger } from "../logger.js";

const TRANSCRIBE_PATH = "/transcribe";

export function createTranscribeGateway(allowedOrigins: string[], engine: AsrEngine) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    handleConnection(ws, engine);
  });

  function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const url = new URL(req.url ?? "", "http://127.0.0.1");
    if (url.pathname !== TRANSCRIBE_PATH) {
      socket.destroy();
      return;
    }
    if (!isOriginAllowed(req.headers.origin, allowedOrigins)) {
      logger.warn(`Rechazado upgrade de WebSocket con origin no permitido: ${req.headers.origin}`);
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  }

  return { handleUpgrade };
}
