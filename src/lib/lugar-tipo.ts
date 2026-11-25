export type LugarTrabajoTipo = "PARTICULAR" | "CONSULTORIO" | "VIRTUAL";

export const LUGAR_TIPO_LABEL: Record<LugarTrabajoTipo, string> = {
  PARTICULAR: "Particular",
  CONSULTORIO: "Consultorio",
  VIRTUAL: "Teleconsulta",
};

export function esLugarVirtual(lugar: { tipo: string } | null | undefined): boolean {
  return lugar?.tipo === "VIRTUAL";
}

// Nombre visible de un lugar: el que cargó el médico, o uno genérico según
// el tipo (un particular o una teleconsulta pueden no tener nombre).
export function nombreLugar(lugar: { tipo?: string | null; nombre: string | null } | null | undefined): string {
  const nombre = lugar?.nombre?.trim();
  if (nombre) return nombre;
  return lugar?.tipo === "VIRTUAL" ? "Teleconsulta" : "Consulta particular";
}
