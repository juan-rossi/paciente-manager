import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { absoluteUrl, esProduccion, getSiteUrl } from "@/lib/site-url";

// Clave de IndexNow (https://www.indexnow.org). No es secreta: el protocolo
// exige publicarla en `/<clave>.txt` (ver `public/`) para probar que el aviso
// lo manda el dueño del dominio. Si se cambia, renombrar también ese archivo.
export const INDEXNOW_KEY = "2eba9c2b4b90bdb7b1c59e8ac93878da";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const TIMEOUT_MS = 5_000;

// Cambió quién sale en el directorio (perfil publicado/despublicado, lugares
// visibles, sanción): el sitemap se regenera en el próximo pedido en vez de
// esperar su `revalidate` de una hora. Solo vale en Route Handlers y Server
// Functions.
export function refrescarSitemap(): void {
  revalidatePath("/sitemap.xml");
}

// Un perfil se publicó por primera vez: además de refrescar el sitemap, avisa
// por IndexNow (Bing, Yandex, Seznam, Naver...; Bing alimenta ChatGPT Search y
// DuckDuckGo). Google no usa IndexNow ni acepta avisos de sitemap: para él
// queda el sitemap (con `lastModified`) y "Solicitar indexación" en Search
// Console. El aviso corre con `after`, sin demorar la respuesta, y nunca falla
// hacia afuera.
export function avisarPerfilPublicado(slug: string): void {
  refrescarSitemap();
  if (!esProduccion()) return;

  const urls = [absoluteUrl(`/directorio/${encodeURIComponent(slug)}`), absoluteUrl("/directorio")];
  after(async () => {
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: new URL(getSiteUrl()).host,
          key: INDEXNOW_KEY,
          keyLocation: absoluteUrl(`/${INDEXNOW_KEY}.txt`),
          urlList: urls,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      // 200/202 = recibido. Un 4xx (clave no verificada todavía, etc.) solo se
      // loguea: el perfil igual queda en el sitemap.
      if (!res.ok) console.warn(`[indexnow] ${res.status} al avisar ${urls[0]}`);
    } catch (err) {
      console.warn("[indexnow] no se pudo avisar", err);
    }
  });
}
