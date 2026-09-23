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
      <div className="flex items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="turnos" className="px-2.5 py-1 text-xs sm:px-3.5 sm:py-1.5 sm:text-sm">
            <CalendarClock className="size-3.5 sm:size-4" />
            Por turnos
          </TabsTrigger>
          <TabsTrigger value="buscar" className="px-2.5 py-1 text-xs sm:px-3.5 sm:py-1.5 sm:text-sm">
            <Search className="size-3.5 sm:size-4" />
            Buscar paciente
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center justify-end gap-3">
          <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 sm:flex">
            <span className="text-sm font-bold text-foreground">{totalPacientes}</span>
            <span className="text-sm text-muted-foreground">pacientes</span>
          </div>
          <Button
            nativeButton={false}
            className="h-7 px-2 text-xs sm:h-auto sm:px-2.5 sm:py-1.5 sm:text-sm"
            render={
              <Link href="/patients/new">
                +<span className="hidden sm:inline"> Nuevo paciente</span>
              </Link>
            }
          />
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
