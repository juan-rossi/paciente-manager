import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // whisper-service es un proyecto npm independiente (su propio
    // package.json/tsconfig.json), nunca importado desde src/ — el ESLint de
    // acá no debería entrar ahí, y menos a sus artefactos de build
    // (dist-package/ tiene código de terceros bundleado con esbuild).
    "whisper-service/**",
  ]),
]);

export default eslintConfig;
