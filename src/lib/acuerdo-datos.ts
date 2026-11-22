// Versión vigente del Acuerdo de tratamiento de datos (texto en
// src/components/legal/acuerdo-datos-contenido.tsx, página pública
// /acuerdo-datos). Si el texto cambia de forma sustancial se incrementa acá y
// se avisa a los médicos con `ACUERDO_DATOS_AVISO_DIAS` días de anticipación
// (punto 8 del acuerdo). Queda guardada en `User.acuerdoDatosVersion` al
// registrarse y en cada `ImportacionHC`.
export const ACUERDO_DATOS_VERSION = "1.0";
export const ACUERDO_DATOS_VIGENTE_DESDE = "22 de noviembre de 2026";
export const ACUERDO_DATOS_AVISO_DIAS = 30;

// Contacto para consultas sobre datos personales (punto 8 del acuerdo).
export const CONTACTO_PRIVACIDAD = "contacto@semio360.com";
