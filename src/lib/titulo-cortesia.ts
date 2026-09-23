export type TituloCortesia =
  | "DR"
  | "DRA"
  | "LIC"
  | "MED"
  | "MED_SIN_TILDE"
  | "ODONT"
  | "OD"
  | "PSIC"
  | "PSI"
  | "BIOQ"
  | "BIOQCA"
  | "KLGO"
  | "KLGA"
  | "ENF";

export const TITULO_CORTESIA_LABELS: Record<TituloCortesia, string> = {
  DR: "Dr.",
  DRA: "Dra.",
  LIC: "Lic.",
  MED: "Méd.",
  MED_SIN_TILDE: "Med.",
  ODONT: "Odont.",
  OD: "Od.",
  PSIC: "Psic.",
  PSI: "Psi.",
  BIOQ: "Bioq.",
  BIOQCA: "Bioqca.",
  KLGO: "Klgo.",
  KLGA: "Klga.",
  ENF: "Enf.",
};

export const TITULO_CORTESIA_VALUES = Object.keys(
  TITULO_CORTESIA_LABELS
) as TituloCortesia[];

export const TITULO_CORTESIA_OPTIONS = TITULO_CORTESIA_VALUES.map((value) => ({
  value,
  label: TITULO_CORTESIA_LABELS[value],
}));

export function formatNombreConTitulo(
  tituloCortesia: TituloCortesia | null | undefined,
  nombre: string
) {
  return tituloCortesia ? `${TITULO_CORTESIA_LABELS[tituloCortesia]} ${nombre}` : nombre;
}
