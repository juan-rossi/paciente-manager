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

export type DashboardTab = "turnos" | "buscar";

type Props = {
  initialTab: DashboardTab;
  initialDate: string;
  initialTurnos: TurnoDelDia[];
  diasConHorario: DiaSemana[];
  totalPacientes: number;
  sinPracticas: boolean;
  puedeConfigurarPracticas: boolean;
  sugerirPerfilPublico: boolean;
  sugerirCompletarBiografia: boolean;
  sugerirCargarPrepagas: boolean;
  sugerirImportarHC: boolean;
};

// Componente cliente separado del server component de la página únicamente
// porque el estado vacío de "Por turnos" necesita cambiar a la pestaña
// "Buscar paciente" mediante código (el acceso rápido "Buscar paciente"),
// algo que un <Tabs defaultValue> sin controlar no permite. La pestaña inicial
// llega del server (`?tab=buscar`) para sobrevivir a un refresh sin parpadeo.
export function DashboardTabs({
  initialTab,
  initialDate,
  initialTurnos,
  diasConHorario,
  totalPacientes,
  sinPracticas,
  puedeConfigurarPracticas,
  sugerirPerfilPublico,
  sugerirCompletarBiografia,
  sugerirCargarPrepagas,
  sugerirImportarHC,
}: Props) {
  const [tab, setTabState] = useState<DashboardTab>(initialTab);

  // La pestaña se refleja en la URL (`?tab=buscar`) para que un refresh deje
  // al usuario donde estaba. `replaceState` evita una navegación de Next
  // (no hace falta volver a pedir la página) y no ensucia el historial.
  function setTab(value: DashboardTab) {
    setTabState(value);
    const url = new URL(window.location.href);
    if (value === "buscar") url.searchParams.set("tab", "buscar");
    else url.searchParams.delete("tab");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as DashboardTab)}>
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
          <button
            type="button"
            onClick={() => setTab("buscar")}
            title="Buscar paciente"
            className="hidden cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
          >
            <span className="text-sm font-bold text-foreground">{totalPacientes}</span>
            <span className="text-sm text-muted-foreground">{totalPacientes === 1 ? "paciente" : "pacientes"}</span>
          </button>
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
          sinPracticas={sinPracticas}
          puedeConfigurarPracticas={puedeConfigurarPracticas}
          sugerirPerfilPublico={sugerirPerfilPublico}
          sugerirCompletarBiografia={sugerirCompletarBiografia}
          sugerirCargarPrepagas={sugerirCargarPrepagas}
          sugerirImportarHC={sugerirImportarHC}
          onBuscarPaciente={() => setTab("buscar")}
        />
      </TabsContent>
      <TabsContent value="buscar">
        <PatientSearch />
      </TabsContent>
    </Tabs>
  );
}
