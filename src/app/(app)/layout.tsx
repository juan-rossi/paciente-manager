import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NavLinks } from "@/components/nav-links";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { DoctorSwitcher } from "@/components/doctor-switcher";
import { UserChip } from "@/components/user-chip";
import { Semio360Mark, Semio360Wordmark } from "@/components/brand/logo";
import { isPlatformAdmin } from "@/lib/admin-access";
import { formatNombreConTitulo } from "@/lib/titulo-cortesia";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isDoctor = user?.role === "DOCTOR";

  // Una secretaria puede asistir a más de un médico -- si es el caso, se
  // muestra el selector para elegir a cuál está atendiendo ahora.
  const doctoresAsignados =
    user && user.role === "SECRETARY"
      ? await prisma.user.findMany({
          where: { role: "DOCTOR", doctorAsignaciones: { some: { secretariaId: user.id } } },
          select: {
            id: true,
            nombre: true,
            apellido: true,
            tituloCortesia: true,
            mensajeriaHabilitada: true,
          },
          orderBy: { nombre: "asc" },
        })
      : [];

  // La mensajería es una configuración del médico (tenant) -- una
  // secretaria hereda la del médico que tiene activo en el selector.
  const mensajeriaHabilitada = isDoctor
    ? (user?.mensajeriaHabilitada ?? true)
    : (doctoresAsignados.find((d) => d.id === user?.activeDoctorId)?.mensajeriaHabilitada ?? true);

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
    ...(mensajeriaHabilitada
      ? [{ href: "/recordatorios", label: "Recordatorios", icon: "MessageCircle" as const }]
      : []),
    // Médico o secretaria con acceso admin otorgado a mano (ver
    // scripts/grant-admin-access.ts) -- puede entrar a /admin sin dejar de
    // usar su cuenta normal.
    ...(user && isPlatformAdmin(user)
      ? [{ href: "/admin", label: "Panel Admin", icon: "LayoutDashboard" as const }]
      : []),
  ];

  const configLink = isDoctor
    ? [{ href: "/configuracion", label: "Configuración", icon: "Settings" as const }]
    : [];

  const nombreConTitulo = user
    ? isDoctor
      ? formatNombreConTitulo(user.tituloCortesia, `${user.nombre} ${user.apellido}`.trim())
      : user.nombre
    : undefined;

  const iniciales = user
    ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase()
    : "";

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
            {user && doctoresAsignados.length >= 2 && (
              <div className="hidden sm:block">
                <DoctorSwitcher doctores={doctoresAsignados} activeDoctorId={user.activeDoctorId ?? ""} />
              </div>
            )}
            <NavLinks links={configLink} />
            {user && nombreConTitulo && (
              <div className="hidden sm:block">
                <UserChip
                  nombreConTitulo={nombreConTitulo}
                  iniciales={iniciales}
                  fotoPerfilBase64={user.fotoPerfilBase64}
                />
              </div>
            )}
            <MobileNavMenu navLinks={navLinks} configLink={configLink} userName={nombreConTitulo} />
          </div>
        </div>
        {user && doctoresAsignados.length >= 2 && (
          <div className="border-t border-border bg-muted/30 px-4 py-2 sm:hidden">
            <DoctorSwitcher
              doctores={doctoresAsignados}
              activeDoctorId={user.activeDoctorId ?? ""}
              className="w-full"
            />
          </div>
        )}
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
