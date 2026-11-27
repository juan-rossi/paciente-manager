export const CONFIGURACION_TABS = [
  "practica",
  "coberturas",
  "aranceles",
  "usuarios",
  "mensajeria",
  "teleconsulta",
  "dictado",
  "perfil",
  "visibilidad",
  "seguridad",
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

export type IrATabDetalle = { tab: ConfiguracionTab; enfocarId?: string };

// `enfocarId`: id de un campo de la tab destino al que llevar al usuario
// (scroll + foco), p.ej. "Cargar monto" desde Información pública.
export function irAConfiguracionTab(tab: ConfiguracionTab, enfocarId?: string) {
  window.dispatchEvent(
    new CustomEvent<IrATabDetalle>(CONFIGURACION_TAB_EVENT, { detail: { tab, enfocarId } })
  );
}

// El panel de la tab destino se monta recién después del cambio de estado:
// se espera a que el campo exista (unos pocos frames) antes de enfocarlo.
export function enfocarCampoCuandoAparezca(id: string, intentos = 30) {
  const el = document.getElementById(id);
  if (!el) {
    if (intentos > 0) requestAnimationFrame(() => enfocarCampoCuandoAparezca(id, intentos - 1));
    return;
  }
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  el.focus({ preventScroll: true });
}

export function esConfiguracionTab(value: string | undefined): value is ConfiguracionTab {
  return !!value && (CONFIGURACION_TABS as readonly string[]).includes(value);
}
