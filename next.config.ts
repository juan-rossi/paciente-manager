import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin esto, `next dev` devuelve 403 en /_next/* (assets, HMR) cuando se
  // entra desde otro host que no sea localhost -- p.ej. abriendo la app
  // desde el celular por la IP de la red local durante desarrollo.
  allowedDevOrigins: ["192.168.1.14"],
  // Gastos y Costos IA se mudaron adentro de Finanzas en el panel admin.
  async redirects() {
    return [
      { source: "/admin/gastos", destination: "/admin/finanzas/gastos", permanent: false },
      { source: "/admin/costos-ia", destination: "/admin/finanzas/costos-ia", permanent: false },
    ];
  },
};

export default nextConfig;
