"use client";

import { useState } from "react";
import { EvolucionTab } from "@/components/patient-form/evolucion-tab";
import type { EvolucionValue } from "@/components/patient-form/types";
import type { FotoValue } from "@/lib/foto-clinica";

type Props = {
  patientId: string;
  initialEvoluciones: EvolucionValue[];
  transcripcionHabilitada?: boolean;
  resumirAlTerminar?: boolean;
  sesiones?: boolean;
  saludMental?: boolean;
  fotosHabilitadas?: boolean;
  fotosIniciales?: FotoValue[];
};

export function EvolucionManager({
  patientId,
  initialEvoluciones,
  transcripcionHabilitada,
  resumirAlTerminar,
  sesiones,
  saludMental,
  fotosHabilitadas,
  fotosIniciales,
}: Props) {
  const [evoluciones, setEvoluciones] = useState<EvolucionValue[]>(initialEvoluciones);

  return (
    <EvolucionTab
      patientId={patientId}
      evoluciones={evoluciones}
      onChangeEvoluciones={setEvoluciones}
      transcripcionHabilitada={transcripcionHabilitada}
      resumirAlTerminar={resumirAlTerminar}
      sesiones={sesiones}
      saludMental={saludMental}
      fotosHabilitadas={fotosHabilitadas}
      fotosIniciales={fotosIniciales}
    />
  );
}
