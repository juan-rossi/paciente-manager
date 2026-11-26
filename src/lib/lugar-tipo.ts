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
// el tipo (un particular puede no tener nombre). La teleconsulta siempre se
// llama "Teleconsulta", aunque haya quedado un nombre viejo guardado.
export function nombreLugar(lugar: { tipo?: string | null; nombre: string | null } | null | undefined): string {
  if (lugar?.tipo === "VIRTUAL") return "Teleconsulta";
  const nombre = lugar?.nombre?.trim();
  if (nombre) return nombre;
  return "Consulta particular";
}

// Mensaje cuando el médico ya tiene el único lugar permitido de ese tipo.
export function mensajeLugarDuplicado(tipo: "PARTICULAR" | "VIRTUAL"): string {
  return tipo === "PARTICULAR"
    ? "Ya tenés un lugar particular cargado."
    : "Ya tenés una teleconsulta cargada.";
}
