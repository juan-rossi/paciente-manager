import Link from "next/link";
import { CalendarClock, ChevronRight, Search, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PatientSearch } from "@/components/patient-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatHoraBA, startOfDayBA } from "@/lib/timezone";
import { cn } from "@/lib/utils";

// Sin esto, Next.js puede prerenderizar la página en build time y congelar la
// lista de "últimos pacientes" en vez de consultarla en cada request.
export const dynamic = "force-dynamic";

type TurnoHoy = {
  id: string;
  inicio: Date;
  nombreYApellido: string;
  dni: string;
  telefono: string;
  obraSocial: string | null;
  patientId: string | null;
  matchType: "dni" | "nombre" | null;
};

const formatHora = formatHoraBA;

async function getTurnosHoy(): Promise<TurnoHoy[]> {
  const inicioHoy = startOfDayBA(new Date());
  const inicioManiana = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000);

  const turnos = await prisma.turno.findMany({
    where: { inicio: { gte: inicioHoy, lt: inicioManiana }, estado: "CONFIRMADO" },
    orderBy: { inicio: "asc" },
    select: {
      id: true,
      inicio: true,
      nombreYApellido: true,
      dni: true,
      telefono: true,
      obraSocial: true,
    },
  });

  return Promise.all(
    turnos.map(async (turno) => {
      const dniMatch = await prisma.patient.findFirst({
        where: { nroDocumento: turno.dni },
        select: { id: true },
      });
      const nombreMatch = dniMatch
        ? null
        : await prisma.patient.findFirst({
            where: { nombreYApellido: { equals: turno.nombreYApellido, mode: "insensitive" } },
            select: { id: true },
          });

      const patient = dniMatch ?? nombreMatch;
      const matchType = dniMatch ? "dni" : nombreMatch ? "nombre" : null;

      return { ...turno, patientId: patient?.id ?? null, matchType };
    })
  );
}

function newPatientHref(turno: TurnoHoy) {
  const params = new URLSearchParams({ nombreYApellido: turno.nombreYApellido, nroDocumento: turno.dni });
  if (turno.telefono) params.set("telefono", turno.telefono);
  if (turno.obraSocial) params.set("obraSocial", turno.obraSocial);
  return `/patients/new?${params.toString()}`;
}

export default async function DashboardPage() {
  const turnosHoy = await getTurnosHoy();

  return (
    <Tabs defaultValue="turnos">
      <TabsList>
        <TabsTrigger value="turnos">
          <CalendarClock className="size-4" />
          Turnos de hoy
        </TabsTrigger>
        <TabsTrigger value="buscar">
          <Search className="size-4" />
          Buscar paciente
        </TabsTrigger>
      </TabsList>
      <TabsContent value="turnos">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            {turnosHoy.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay turnos agendados para hoy.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {turnosHoy.map((turno) =>
                  turno.patientId ? (
                    <li key={turno.id}>
                      <Link
                        href={`/patients/${turno.patientId}?turnoId=${turno.id}`}
                        className="flex items-center gap-3 rounded-md border border-border p-2 transition-colors hover:bg-accent/40"
                      >
                        <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold tabular-nums">
                          {formatHora(turno.inicio)}
                        </span>
                        <div className="w-48 min-w-0 shrink-0">
                          <p className="truncate text-sm font-medium">{turno.nombreYApellido}</p>
                          <p className="truncate text-xs text-muted-foreground">DNI {turno.dni}</p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "w-28 shrink-0 justify-center",
                            turno.matchType === "dni"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          )}
                        >
                          Match por {turno.matchType === "dni" ? "DNI" : "nombre"}
                        </Badge>
                        <div className="flex-1" />
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ) : (
                    <li
                      key={turno.id}
                      className="flex items-center gap-3 rounded-md border border-dashed border-border p-2"
                    >
                      <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold tabular-nums">
                        {formatHora(turno.inicio)}
                      </span>
                      <div className="w-48 min-w-0 shrink-0">
                        <p className="truncate text-sm font-medium">{turno.nombreYApellido}</p>
                        <p className="truncate text-xs text-muted-foreground">DNI {turno.dni}</p>
                      </div>
                      <div className="flex-1" />
                      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={newPatientHref(turno)} />}>
                        <UserPlus className="size-3.5" />
                        Crear paciente
                      </Button>
                    </li>
                  )
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="buscar">
        <PatientSearch />
      </TabsContent>
    </Tabs>
  );
}
