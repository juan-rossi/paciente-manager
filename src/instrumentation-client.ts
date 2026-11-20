import { z } from "zod";

// Corre en el navegador antes que el resto del frontend (ver
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md).
//
// zod 4 compila validadores con `new Function(...)` si puede, y para saberlo
// prueba `Function("")` al construir el primer `z.object()`. Con la CSP sin
// 'unsafe-eval' esa prueba aparece como violación en cada página con
// formularios (en Report-Only solo ensucia la consola; en enforce zod sigue
// sin eval, pero el aviso se reporta igual). `jitless` evita la prueba: las
// validaciones son las mismas, sin código generado. Tiene que configurarse
// antes de que se evalúe cualquier módulo con schemas, por eso va acá.
z.config({ jitless: true });
