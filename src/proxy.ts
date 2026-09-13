import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/patients",
  "/turnos",
  "/recordatorios",
  "/configuracion",
  "/onboarding",
];
const DOCTOR_ONLY_PREFIXES = ["/dashboard", "/patients", "/configuracion"];
const AUTH_ENTRY_PAGES = ["/login", "/signup"];

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
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
    const fallback = session.user.role !== "DOCTOR" ? "/turnos" : "/dashboard";
    return NextResponse.redirect(new URL(fallback, request.url));
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
    "/login",
    "/signup",
  ],
};
