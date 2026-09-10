import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

const SUPPORTED_MODELS = ["tiny", "base", "small", "medium"] as const;

const configSchema = z.object({
  model: z.enum(SUPPORTED_MODELS).default("small"),
  language: z.string().min(2).default("es"),
  port: z.number().int().min(1).max(65535).default(7891),
  allowedOrigins: z.array(z.string()).default(["http://localhost:3000"]),
});

export type WhisperModel = (typeof SUPPORTED_MODELS)[number];
export type ServiceConfig = z.infer<typeof configSchema>;

// En desarrollo, la raíz es "dos niveles arriba" de este archivo
// (src/config/loadConfig.ts -> src/ -> raíz). Una vez empaquetado, todo el
// código queda bundleado en un solo archivo (ver scripts/build-package.mjs),
// así que esa cuenta ya no da la carpeta correcta — el launcher empaquetado
// exporta WHISPER_SERVICE_ROOT antes de arrancar, apuntando a la carpeta real
// donde viven `config/` y los demás archivos del paquete instalado.
const SERVICE_ROOT =
  process.env.WHISPER_SERVICE_ROOT ?? path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const CONFIG_PATH = path.join(SERVICE_ROOT, "config", "config.json");
const CONFIG_EXAMPLE_PATH = path.join(SERVICE_ROOT, "config", "config.example.json");

export function getServiceRoot(): string {
  return SERVICE_ROOT;
}

// El médico puede no haber creado `config.json` todavía (primer arranque) — en
// ese caso arrancamos con los valores de `config.example.json` en vez de fallar.
export function loadConfig(): ServiceConfig {
  const path_ = existsSync(CONFIG_PATH) ? CONFIG_PATH : CONFIG_EXAMPLE_PATH;
  const raw = JSON.parse(readFileSync(path_, "utf-8"));
  const result = configSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Configuración inválida en ${path_}: ${result.error.issues.map((i) => i.message).join("; ")}`
    );
  }
  return result.data;
}
