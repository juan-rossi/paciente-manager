export type TurnoDiffField = "nombreYApellido" | "nroDocumento" | "telefono" | "obraSocial";

export type TurnoDiff = {
  field: TurnoDiffField;
  label: string;
  oldValue: string | null;
  newValue: string;
};

type PatientLike = {
  nombreYApellido: string;
  nroDocumento: string | null;
  telefono: string | null;
  obraSocial: string | null;
};

type TurnoLike = {
  nombreYApellido: string;
  dni: string;
  telefono: string;
  obraSocial: string | null;
};

/**
 * Compara los datos de contacto del turno contra los del paciente. Solo se reporta una
 * diferencia si el dato del turno no está vacío y difiere del valor actual del paciente.
 */
export function computeTurnoDiffs(patient: PatientLike, turno: TurnoLike): TurnoDiff[] {
  const candidates: Array<{ field: TurnoDiffField; label: string; turnoValue: string | null; patientValue: string | null }> = [
    {
      field: "nombreYApellido",
      label: "Nombre y Apellido",
      turnoValue: turno.nombreYApellido,
      patientValue: patient.nombreYApellido,
    },
    { field: "nroDocumento", label: "DNI", turnoValue: turno.dni, patientValue: patient.nroDocumento },
    { field: "telefono", label: "Teléfono", turnoValue: turno.telefono, patientValue: patient.telefono },
    { field: "obraSocial", label: "Obra Social", turnoValue: turno.obraSocial, patientValue: patient.obraSocial },
  ];

  const diffs: TurnoDiff[] = [];
  for (const c of candidates) {
    const turnoTrimmed = c.turnoValue?.trim() ?? "";
    if (!turnoTrimmed) continue;
    const patientTrimmed = c.patientValue?.trim() ?? "";
    if (turnoTrimmed.toLowerCase() === patientTrimmed.toLowerCase()) continue;
    diffs.push({ field: c.field, label: c.label, oldValue: c.patientValue, newValue: turnoTrimmed });
  }
  return diffs;
}
