import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { NavLinks } from "@/components/nav-links";
import { Semio360Mark, Semio360Wordmark } from "@/components/brand/logo";
import { isPlatformAdmin } from "@/lib/admin-access";

const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" as const },
  { href: "/admin/medicos", label: "Médicos", icon: "Stethoscope" as const, matchPrefixes: ["/admin/medicos"] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // src/proxy.ts ya protege /admin y redirige a cualquiera que no tenga
  // acceso admin -- esto es defensa en profundidad antes de tocar datos
  // cross-tenant de todos los médicos de la plataforma.
  if (!user || !isPlatformAdmin(user)) {
    redirect("/login");
  }

  // Un ADMIN de plataforma pura no tiene tenant/dashboard al que volver
  // (ver getTenantId()); un médico/secretaria con el flag `isAdmin` sí.
  const homeDelUsuario =
    user.role === "DOCTOR" ? "/dashboard" : user.role === "SECRETARY" ? "/turnos" : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-5 sm:gap-7">
            <a href="/admin" className="flex items-center gap-2.5">
              <Semio360Mark className="size-8" />
              <Semio360Wordmark className="h-5" />
              <span className="ml-1 inline-flex h-5 items-center rounded-full bg-secondary px-2 text-xs font-medium text-secondary-foreground">
                Panel Admin
              </span>
            </a>
            {/* Solo dos secciones -- se muestran siempre (sin el "hidden
                sm:flex" del nav de la app de consultorio) en vez de armar un
                menú mobile aparte para dos links. */}
            <NavLinks links={ADMIN_NAV_LINKS} className="flex flex-wrap gap-4" />
          </div>
          <div className="flex items-center gap-4">
            {homeDelUsuario && (
              <a
                href={homeDelUsuario}
                className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
              >
                Volver a mi cuenta
              </a>
            )}
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-medium">
                {user.nombre} {user.apellido}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.role === "ADMIN" ? "Owner" : "Acceso admin"}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  );
}
