export type TituloCortesia = "DR" | "DRA" | "LIC";

export const TITULO_CORTESIA_LABELS: Record<TituloCortesia, string> = {
  DR: "Dr.",
  DRA: "Dra.",
  LIC: "Lic.",
};

export const TITULO_CORTESIA_OPTIONS = (
  Object.keys(TITULO_CORTESIA_LABELS) as TituloCortesia[]
).map((value) => ({ value, label: TITULO_CORTESIA_LABELS[value] }));

export function formatNombreConTitulo(
  tituloCortesia: TituloCortesia | null | undefined,
  nombre: string
) {
  return tituloCortesia ? `${TITULO_CORTESIA_LABELS[tituloCortesia]} ${nombre}` : nombre;
}
