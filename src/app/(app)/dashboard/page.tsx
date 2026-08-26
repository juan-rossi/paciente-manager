import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PatientSearch } from "@/components/patient-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TURNOS_ENABLED } from "@/lib/feature-flags";

// Sin esto, Next.js puede prerenderizar la página en build time y congelar la
// lista de "últimos pacientes" en vez de consultarla en cada request.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const turnosHoy = TURNOS_ENABLED
    ? await (async () => {
        const inicioHoy = new Date();
        inicioHoy.setHours(0, 0, 0, 0);
        const inicioManiana = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000);
        return prisma.turno.count({
          where: { inicio: { gte: inicioHoy, lt: inicioManiana }, estado: "CONFIRMADO" },
        });
      })()
    : null;

  return (
    <div className={TURNOS_ENABLED ? "grid gap-6 lg:grid-cols-3" : undefined}>
      <div className={TURNOS_ENABLED ? "lg:col-span-2" : undefined}>
        <PatientSearch />
      </div>
      {turnosHoy !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Turnos de hoy</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <CalendarClock className="size-4.5" />
            </span>
            <p className="text-sm">
              {turnosHoy === 0
                ? "No hay turnos agendados para hoy."
                : `${turnosHoy} turno${turnosHoy === 1 ? "" : "s"} agendado${turnosHoy === 1 ? "" : "s"} para hoy.`}
            </p>
            <Button size="sm" nativeButton={false} render={<Link href="/turnos" />}>
              Ver calendario de turnos
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
