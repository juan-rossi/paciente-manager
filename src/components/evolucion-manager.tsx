"use client";

import { useState } from "react";
import { EvolucionTab } from "@/components/patient-form/evolucion-tab";
import type { EvolucionValue } from "@/components/patient-form/types";

type Props = {
  patientId: string;
  initialEvoluciones: EvolucionValue[];
};

export function EvolucionManager({ patientId, initialEvoluciones }: Props) {
  const [evoluciones, setEvoluciones] = useState<EvolucionValue[]>(initialEvoluciones);

  return (
    <EvolucionTab
      patientId={patientId}
      evoluciones={evoluciones}
      onChangeEvoluciones={setEvoluciones}
    />
  );
}
