import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/patients", "/turnos", "/recordatorios", "/configuracion"];
const DOCTOR_ONLY_PREFIXES = ["/dashboard", "/patients", "/configuracion"];

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

  if (session && session.role === "SECRETARY") {
    const isDoctorOnly = DOCTOR_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (isDoctorOnly) {
      return NextResponse.redirect(new URL("/turnos", request.url));
    }
  }

  if (pathname === "/login" && session) {
    const fallback = session.role !== "DOCTOR" ? "/turnos" : "/dashboard";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patients/:path*",
    "/turnos/:path*",
    "/recordatorios/:path*",
    "/configuracion/:path*",
    "/login",
  ],
};
