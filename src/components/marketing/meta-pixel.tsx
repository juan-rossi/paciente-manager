import Script from "next/script";

// Píxel de Meta para medir y optimizar los anuncios de Instagram. Solo se
// monta en el home, /signup y /onboarding -- nunca en la app (datos de
// pacientes) ni en el directorio (lo usan pacientes) -- y solo si está
// configurado el ID.
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();

export function MetaPixel({ evento }: { evento?: "CompleteRegistration" }) {
  if (!PIXEL_ID || !/^\d+$/.test(PIXEL_ID)) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');${evento ? `fbq('track','${evento}');` : ""}`}
    </Script>
  );
}
