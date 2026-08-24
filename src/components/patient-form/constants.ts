export const ANTECEDENTES_COLUMNA_1 = [
  { tipo: "DISLIPEMIA", label: "Displemia" },
  { tipo: "HIPOTIROIDISMO", label: "Hipotiroidismo" },
  { tipo: "HIPERTIROIDISMO", label: "Hipertiroidismo" },
  { tipo: "ARTRITIS", label: "Artritis" },
  { tipo: "DIABETES", label: "Diabetes" },
  { tipo: "ALERGIA", label: "Alergia" },
  { tipo: "NEOPLASIAS", label: "Neoplasias" },
  { tipo: "ARRITMIAS", label: "Arritmias" },
  { tipo: "HTA", label: "HTA" },
  { tipo: "ARTROSIS", label: "Artrosis" },
] as const;

export const ANTECEDENTES_COLUMNA_2 = [
  { tipo: "ALCOHOLISMO", label: "Alcoholismo" },
  { tipo: "PSIQUIATRICAS", label: "Psiquiátricas" },
  { tipo: "INFECCIOSAS", label: "Infecciosas" },
  { tipo: "PROSTATA", label: "Próstata" },
  { tipo: "NOD_MAMAS", label: "Nod. mamas" },
  { tipo: "EPOC", label: "EPOC" },
  { tipo: "CARDIOPATIAS", label: "Cardiopatías" },
  { tipo: "NEUROLOGICAS", label: "Neurológicas" },
  { tipo: "ASMA", label: "Asma" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_ORDEN = [
  ...ANTECEDENTES_COLUMNA_1,
  ...ANTECEDENTES_COLUMNA_2,
];

export const ESTADO_CIVIL_OPTIONS = [
  { value: "SOLTERO", label: "Soltero" },
  { value: "CASADO", label: "Casado" },
  { value: "VIUDO", label: "Viudo" },
  { value: "CONCUBINO", label: "Concubino" },
] as const;
