declare global {
  interface Window {
    fbq?: (accion: "track", evento: string) => void;
  }
}

// Avisa al píxel de Meta (ver `MetaPixel`) que se creó una cuenta. No hace
// nada si el píxel no está cargado.
export function trackRegistroCompleto() {
  window.fbq?.("track", "CompleteRegistration");
}
