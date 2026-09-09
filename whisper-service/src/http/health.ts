import type { IncomingMessage, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getServiceRoot } from "../config/loadConfig.js";
import { serviceState } from "../state.js";
import { isOriginAllowed } from "../cors.js";

const packageJson = JSON.parse(
  readFileSync(path.join(getServiceRoot(), "package.json"), "utf-8")
) as { version: string };

export function handleHealth(req: IncomingMessage, res: ServerResponse, allowedOrigins: string[]): void {
  const origin = req.headers.origin;
  if (!isOriginAllowed(origin, allowedOrigins)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Origin no permitido" }));
    return;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;

  res.writeHead(200, headers);
  res.end(
    JSON.stringify({
      status: serviceState.status,
      version: packageJson.version,
    })
  );
}
