import Link from "next/link";
import { CalendarClock, Search } from "lucide-react";
import { PatientSearch } from "@/components/patient-search";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TurnosPorDia } from "@/components/turnos-por-dia";
import { getTurnosDelDia } from "@/lib/turnos-del-dia";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { formatDateParamBA } from "@/lib/timezone";

// Sin esto, Next.js puede prerenderizar la página en build time y congelar la
// lista de "últimos pacientes" en vez de consultarla en cada request.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const hoy = new Date();
  const { turnos, diasConHorario } = await getTurnosDelDia(hoy, getTenantId(user));

  return (
    <Tabs defaultValue="turnos">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="turnos">
            <CalendarClock className="size-4" />
            Por turnos
          </TabsTrigger>
          <TabsTrigger value="buscar">
            <Search className="size-4" />
            Buscar paciente
          </TabsTrigger>
        </TabsList>
        <Button size="sm" nativeButton={false} render={<Link href="/patients/new">+ Nuevo paciente</Link>} />
      </div>
      <TabsContent value="turnos">
        <TurnosPorDia
          initialDate={formatDateParamBA(hoy)}
          initialTurnos={turnos}
          diasConHorario={diasConHorario}
        />
      </TabsContent>
      <TabsContent value="buscar">
        <PatientSearch />
      </TabsContent>
    </Tabs>
  );
}
