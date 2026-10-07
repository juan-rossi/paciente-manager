export const CONFIGURACION_TABS = [
  "practica",
  "usuarios",
  "mensajeria",
  "perfil",
  "plan",
  "datos",
] as const;

export type ConfiguracionTab = (typeof CONFIGURACION_TABS)[number];

export const DEFAULT_CONFIGURACION_TAB: ConfiguracionTab = "practica";

export const CONFIGURACION_TAB_COOKIE = "configuracion-tab";

// Evento de window para que un componente dentro de una tab pueda mandar al
// usuario a otra (p.ej. "Editar prácticas" desde Mi perfil) -- el estado de la
// tab vive en ConfiguracionTabs, no en una ruta.
export const CONFIGURACION_TAB_EVENT = "configuracion:ir-a-tab";

export function irAConfiguracionTab(tab: ConfiguracionTab) {
  window.dispatchEvent(new CustomEvent(CONFIGURACION_TAB_EVENT, { detail: tab }));
}

export function esConfiguracionTab(value: string | undefined): value is ConfiguracionTab {
  return !!value && (CONFIGURACION_TABS as readonly string[]).includes(value);
}
