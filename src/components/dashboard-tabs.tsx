"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Search } from "lucide-react";
import { PatientSearch } from "@/components/patient-search";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TurnosPorDia } from "@/components/turnos-por-dia";
import type { DiaSemana } from "@/lib/slots";
import type { TurnoDelDia } from "@/lib/turnos-del-dia";

type Props = {
  initialDate: string;
  initialTurnos: TurnoDelDia[];
  diasConHorario: DiaSemana[];
  totalPacientes: number;
};

// Componente cliente separado del server component de la página únicamente
// porque el estado vacío de "Por turnos" necesita cambiar a la pestaña
// "Buscar paciente" mediante código (el acceso rápido "Buscar paciente"),
// algo que un <Tabs defaultValue> sin controlar no permite.
export function DashboardTabs({ initialDate, initialTurnos, diasConHorario, totalPacientes }: Props) {
  const [tab, setTab] = useState("turnos");

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as string)}>
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5">
            <span className="text-sm font-bold text-foreground">{totalPacientes}</span>
            <span className="text-sm text-muted-foreground">pacientes</span>
          </div>
          <Button nativeButton={false} render={<Link href="/patients/new">+ Nuevo paciente</Link>} />
        </div>
      </div>
      <TabsContent value="turnos">
        <TurnosPorDia
          initialDate={initialDate}
          initialTurnos={initialTurnos}
          diasConHorario={diasConHorario}
          onBuscarPaciente={() => setTab("buscar")}
        />
      </TabsContent>
      <TabsContent value="buscar">
        <PatientSearch />
      </TabsContent>
    </Tabs>
  );
}
