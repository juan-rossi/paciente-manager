import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Una zona horaria que no es ni la de Vercel (UTC) ni la de Argentina:
    // la lógica de turnos tiene que dar lo mismo sin importar el TZ del proceso.
    env: { TZ: "Asia/Tokyo" },
  },
});
