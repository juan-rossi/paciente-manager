import http from "node:http";
import { loadConfig } from "./config/loadConfig.js";
import { createAsrEngine, type AsrEngine } from "./asr/engine.js";
import { createTranscribeGateway } from "./ws/gateway.js";
import { handleHealth } from "./http/health.js";
import { serviceState } from "./state.js";
import { logger } from "./logger.js";

/**
 * Arranca el servidor HTTP+WebSocket. La usan tanto `npm run dev` (más abajo,
 * auto-invocado) como el binario empaquetado (`packaged-main.ts`, que además
 * levanta el ícono de bandeja y el auto-arranque antes de llamar acá).
 */
export async function startServer(): Promise<void> {
  const config = loadConfig();
  logger.info(`Configuración: modelo=${config.model} idioma=${config.language} puerto=${config.port}`);

  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url?.startsWith("/health")) {
      handleHealth(req, res, config.allowedOrigins);
      return;
    }
    res.writeHead(404).end();
  });

  // Sin este handler, un puerto ocupado (EADDRINUSE) tira una excepción no
  // capturada y el proceso muere con un stack trace — pasa fácil si el
  // médico abre el acceso directo a mano mientras el auto-arranque ya lo
  // dejó corriendo. Es una situación esperable, no un error fatal: lo más
  // probable es que YA haya una instancia sana escuchando ahí.
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.info(
        `El puerto ${config.port} ya está en uso — probablemente el transcriptor ya está corriendo. Cerrando esta instancia.`
      );
      process.exit(0);
    }
    logger.error(`Error del servidor HTTP: ${error.message}`);
    process.exitCode = 1;
  });

  // Empezamos a escuchar antes de que el modelo termine de cargar/descargar, para
  // que GET /health ya responda "downloading_model" en vez de que la conexión falle.
  server.listen(config.port, "127.0.0.1", () => {
    logger.info(`Escuchando en http://127.0.0.1:${config.port} (solo loopback)`);
  });

  serviceState.status = "downloading_model";
  let engine: AsrEngine;
  try {
    engine = await createAsrEngine(config, (percent) => {
      logger.info(`Descarga de modelo: ${percent}%`);
    });
  } catch (error) {
    serviceState.status = "error";
    serviceState.errorMessage = (error as Error).message;
    logger.error(`No se pudo inicializar el motor de transcripción: ${(error as Error).message}`);
    return;
  }

  const gateway = createTranscribeGateway(config.allowedOrigins, engine);
  server.on("upgrade", (req, socket, head) => gateway.handleUpgrade(req, socket, head));

  serviceState.status = "ok";
  logger.info("Servicio listo para transcribir.");

  async function shutdown(signal: string): Promise<void> {
    logger.info(`Recibido ${signal}, cerrando servicio...`);
    server.close();
    await engine.release();
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

// Se auto-invoca al importar este módulo — tanto `npm run dev`/`npm start`
// (que corren este archivo directo) como `packaged-main.ts` (que lo importa
// por su efecto secundario y además levanta bandeja + auto-arranque encima).
startServer().catch((error) => {
  logger.error(`Error fatal: ${(error as Error).message}`);
  process.exitCode = 1;
});
