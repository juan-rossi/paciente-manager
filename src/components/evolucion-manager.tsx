"use client";

import { useState } from "react";
import { EvolucionTab } from "@/components/patient-form/evolucion-tab";
import type { EvolucionValue } from "@/components/patient-form/types";

type Props = {
  patientId: string;
  initialEvoluciones: EvolucionValue[];
  transcripcionHabilitada?: boolean;
  resumirAlTerminar?: boolean;
};

export function EvolucionManager({
  patientId,
  initialEvoluciones,
  transcripcionHabilitada,
  resumirAlTerminar,
}: Props) {
  const [evoluciones, setEvoluciones] = useState<EvolucionValue[]>(initialEvoluciones);

  return (
    <EvolucionTab
      patientId={patientId}
      evoluciones={evoluciones}
      onChangeEvoluciones={setEvoluciones}
      transcripcionHabilitada={transcripcionHabilitada}
      resumirAlTerminar={resumirAlTerminar}
    />
  );
}
