import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { TURNOS_ENABLED } from "@/lib/feature-flags";

const DOCTOR_NAME = process.env.DOCTOR_NAME ?? "Dr. Juan Pablo Beligoy";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isDoctor = user?.role === "DOCTOR";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href={TURNOS_ENABLED && !isDoctor ? "/turnos" : "/dashboard"}
              className="flex items-center gap-2.5"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Stethoscope className="size-4.5" />
              </span>
              <span className="text-lg font-semibold tracking-tight">{DOCTOR_NAME}</span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm font-medium text-muted-foreground sm:flex">
              {isDoctor && <Link href="/dashboard" className="hover:text-foreground">Pacientes</Link>}
              {TURNOS_ENABLED && (
                <Link href="/turnos" className="hover:text-foreground">
                  Turnos
                </Link>
              )}
              {TURNOS_ENABLED && isDoctor && (
                <Link href="/configuracion" className="hover:text-foreground">
                  Configuración
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}
