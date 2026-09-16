import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isPlatformAdmin } from "@/lib/admin-access";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/patients",
  "/turnos",
  "/recordatorios",
  "/configuracion",
  "/onboarding",
  "/admin",
];
const DOCTOR_ONLY_PREFIXES = ["/dashboard", "/patients", "/configuracion"];
// Rutas de la app de consultorio (médico/secretaria) -- un ADMIN no
// pertenece a ningún tenant y no tiene nada que hacer acá (ver
// src/lib/tenant.ts).
const APP_PREFIXES = [
  "/dashboard",
  "/patients",
  "/turnos",
  "/recordatorios",
  "/configuracion",
  "/onboarding",
];
const AUTH_ENTRY_PAGES = ["/login", "/signup"];

function homeFor(role: string) {
  if (role === "ADMIN") return "/admin";
  if (role !== "DOCTOR") return "/turnos";
  return "/dashboard";
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // El ADMIN (owner de Semio 360) ve todas las cuentas de la plataforma, no
  // pertenece a ningún tenant -- no tiene nada que hacer en la app de un
  // médico (chocaría con getTenantId(), ver src/lib/tenant.ts).
  if (
    session &&
    session.user.role === "ADMIN" &&
    APP_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // A la inversa: /admin es para el owner/staff de Semio 360 -- la cuenta
  // de plataforma pura (role === "ADMIN") o un médico/secretaria al que se
  // le otorgó el flag `isAdmin` (ver isPlatformAdmin()).
  if (session && !isPlatformAdmin(session.user) && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL(homeFor(session.user.role), request.url));
  }

  if (session && session.user.role === "SECRETARY") {
    const isDoctorOnly = DOCTOR_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (isDoctorOnly) {
      return NextResponse.redirect(new URL("/turnos", request.url));
    }
  }

  // Un DOCTOR que se registró con Google todavía no tiene matrícula (Google
  // no la provee) -- lo mandamos a completar el perfil antes de dejarlo
  // entrar a cualquier otra ruta protegida.
  if (
    session &&
    session.user.role === "DOCTOR" &&
    !session.user.perfilCompleto &&
    isProtected &&
    pathname !== "/onboarding"
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (AUTH_ENTRY_PAGES.includes(pathname) && session) {
    return NextResponse.redirect(new URL(homeFor(session.user.role), request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patients/:path*",
    "/turnos/:path*",
    "/recordatorios/:path*",
    "/configuracion/:path*",
    "/onboarding",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
