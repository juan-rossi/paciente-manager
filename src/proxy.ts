import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isPlatformAdmin } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { esActivo } from "@/lib/plan";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/patients",
  "/turnos",
  "/recordatorios",
  "/configuracion",
  "/onboarding",
  "/admin",
  "/cuenta-inactiva",
];
const DOCTOR_ONLY_PREFIXES = ["/dashboard", "/patients", "/configuracion"];
// Rutas que requieren una cuenta al día (trial vigente o suscripción paga
// vigente, ver `esActivo()`) -- deliberadamente sin `/configuracion`, que
// tiene que seguir siendo alcanzable con la cuenta vencida para poder
// pagar (ver "Mi plan"), y sin `/admin`/`/onboarding`.
const PLAN_GATED_PREFIXES = ["/dashboard", "/patients", "/turnos", "/recordatorios"];
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

export default auth(async (request) => {
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

  // Trial vencido o suscripción vencida (impago tras la gracia, ver
  // `/api/mercadopago/webhook`) -- se consulta en vivo (no cacheado en la
  // sesión) para que un pago recién confirmado desbloquee sin esperar a
  // que se cierre sesión. Se resuelve el tenant real de la cuenta (para
  // una secretaria, el médico que tiene activo).
  if (session && PLAN_GATED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const actor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, activeDoctorId: true, trialEndsAt: true, planEndsAt: true },
    });
    if (actor) {
      const cuenta =
        actor.role === "DOCTOR"
          ? actor
          : actor.activeDoctorId
            ? await prisma.user.findUnique({
                where: { id: actor.activeDoctorId },
                select: { trialEndsAt: true, planEndsAt: true },
              })
            : null;
      if (cuenta && !esActivo(cuenta)) {
        return NextResponse.redirect(new URL("/cuenta-inactiva", request.url));
      }
    }
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
    "/cuenta-inactiva",
    "/login",
    "/signup",
  ],
};
