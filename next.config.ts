import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Content Security Policy -- variante "sin nonces" de la guía de Next
// (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md):
// los nonces obligarían a renderizar todo dinámicamente. `'unsafe-inline'`
// en scripts lo necesita Next para hidratar; aun así la política bloquea
// scripts de otros orígenes, iframes ajenos, <object>, cambiar <base>, y
// -- lo más valioso para datos clínicos -- que un script inyectado mande
// datos a otro dominio (`connect-src`).
//
// Orígenes externos que usa el navegador: solo Turnstile (Cloudflare). Google
// OAuth y el checkout de MercadoPago son redirecciones; Places, MercadoPago,
// Groq y OpenAI se llaman desde el servidor. Las fuentes las sirve next/font
// desde nuestro dominio.
//
// Se publica primero como Report-Only: el navegador solo avisa en la consola
// lo que bloquearía. Pasar a `Content-Security-Policy` cuando QA no muestre
// violaciones (ver docs/PLAN-SEGURIDAD.md, F4).
const TURNSTILE = "https://challenges.cloudflare.com";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Grabación del dictado: el audio se maneja como blob.
  "media-src 'self' blob:",
  `connect-src 'self' ${TURNSTILE}`,
  `frame-src ${TURNSTILE}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  // Algunos navegadores aplican form-action también a la redirección que
  // sigue al submit (login con Google).
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
  // Ninguna página se embebe en otro sitio (clickjacking). Equivale a
  // `frame-ancestors 'none'`, que en Report-Only no se aplica.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Los links /t/[codigo] e /invitacion?token=... llevan secretos en la URL:
  // a otros sitios solo viaja el origen, nunca la ruta.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Micrófono solo para el dictado, en nuestro propio origen.
  {
    key: "Permissions-Policy",
    value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=()",
  },
  // HTTPS obligatorio por 2 años, también en subdominios (qa.). Sin
  // `preload`: sumarse a la lista de precarga de los navegadores es un
  // compromiso difícil de revertir, se decide aparte. En desarrollo no:
  // localhost es http.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  // Sin esto, `next dev` devuelve 403 en /_next/* (assets, HMR) cuando se
  // entra desde otro host que no sea localhost -- p.ej. abriendo la app
  // desde el celular por la IP de la red local durante desarrollo.
  allowedDevOrigins: ["192.168.1.14"],
  // No anunciar el framework (`X-Powered-By: Next.js`).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Gastos y Costos IA se mudaron adentro de Finanzas en el panel admin.
  async redirects() {
    return [
      { source: "/admin/gastos", destination: "/admin/finanzas/gastos", permanent: false },
      { source: "/admin/costos-ia", destination: "/admin/finanzas/costos-ia", permanent: false },
    ];
  },
};

export default nextConfig;
