import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin esto, `next dev` devuelve 403 en /_next/* (assets, HMR) cuando se
  // entra desde otro host que no sea localhost -- p.ej. abriendo la app
  // desde el celular por la IP de la red local durante desarrollo.
  allowedDevOrigins: ["192.168.1.14", "vinyl-metals-commitments-levitra.trycloudflare.com"],
};

export default nextConfig;
