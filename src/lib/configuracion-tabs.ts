export const CONFIGURACION_TABS = [
  "practica",
  "usuarios",
  "mensajeria",
  "transcriptor",
  "perfil",
  "plan",
  "datos",
] as const;

export type ConfiguracionTab = (typeof CONFIGURACION_TABS)[number];

export const DEFAULT_CONFIGURACION_TAB: ConfiguracionTab = "practica";

export const CONFIGURACION_TAB_COOKIE = "configuracion-tab";

export function esConfiguracionTab(value: string | undefined): value is ConfiguracionTab {
  return !!value && (CONFIGURACION_TABS as readonly string[]).includes(value);
}
