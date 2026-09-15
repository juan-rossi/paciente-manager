import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { NavLinks } from "@/components/nav-links";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { Semio360Mark, Semio360Wordmark } from "@/components/brand/logo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isDoctor = user?.role === "DOCTOR";

  const navLinks = [
    ...(isDoctor
      ? [
          {
            href: "/dashboard",
            label: "Pacientes",
            icon: "Users" as const,
            matchPrefixes: ["/dashboard", "/patients"],
          },
        ]
      : []),
    { href: "/turnos", label: "Turnos", icon: "CalendarDays" as const },
    { href: "/recordatorios", label: "Recordatorios", icon: "MessageCircle" as const },
  ];

  const configLink = isDoctor
    ? [{ href: "/configuracion", label: "Configuración", icon: "Settings" as const }]
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card shadow-sm print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href={!isDoctor ? "/turnos" : "/dashboard"}
              className="flex items-center gap-2.5"
            >
              <Semio360Mark className="size-8" />
              <Semio360Wordmark className="h-5" />
            </Link>
            <NavLinks links={navLinks} />
          </div>
          <div className="flex items-center gap-6">
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.nombre}
              </span>
            )}
            <NavLinks links={configLink} />
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
            <MobileNavMenu navLinks={navLinks} configLink={configLink} userName={user?.nombre} />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
