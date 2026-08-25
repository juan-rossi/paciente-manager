import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth";
import { TURNOS_ENABLED } from "@/lib/feature-flags";

const PROTECTED_PREFIXES = ["/dashboard", "/patients", "/turnos", "/configuracion"];
const DOCTOR_ONLY_PREFIXES = ["/dashboard", "/patients", "/configuracion"];
const TURNOS_PREFIXES = ["/turnos", "/configuracion"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!TURNOS_ENABLED && session) {
    const isTurnosRoute = TURNOS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (isTurnosRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (TURNOS_ENABLED && session && session.role === "SECRETARY") {
    const isDoctorOnly = DOCTOR_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (isDoctorOnly) {
      return NextResponse.redirect(new URL("/turnos", request.url));
    }
  }

  if (pathname === "/login" && session) {
    const fallback = TURNOS_ENABLED && session.role !== "DOCTOR" ? "/turnos" : "/dashboard";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/patients/:path*", "/turnos/:path*", "/configuracion/:path*", "/login"],
};
