import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PatientSearch } from "@/components/patient-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Sin esto, Next.js puede prerenderizar la página en build time y congelar la
// lista de "últimos pacientes" en vez de consultarla en cada request.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const patients = await prisma.patient.findMany({
    select: {
      id: true,
      nombreYApellido: true,
      nroDocumento: true,
      telefono: true,
      fechaNacimiento: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const initialPatients = patients.map((patient) => ({
    ...patient,
    fechaNacimiento: patient.fechaNacimiento?.toISOString() ?? null,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <PatientSearch initialPatients={initialPatients} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Turnos de hoy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-accent/40 px-4 py-8 text-center">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <CalendarClock className="size-4.5" />
            </span>
            <p className="text-sm font-medium">Próximamente</p>
            <p className="text-xs text-muted-foreground">
              Vas a poder ver acá los turnos agendados para hoy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
