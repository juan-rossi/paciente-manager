// Versión vigente de los Términos y condiciones. Si el texto cambia de forma
// sustancial, se incrementa acá: queda guardada en `User.terminosVersion` al
// aceptar, así se sabe qué texto aceptó cada médico.
export const TERMINOS_VERSION = "1.1";
export const TERMINOS_VIGENTE_DESDE = "10 de octubre de 2026";

// Cookie que el cliente setea justo antes de `signIn("google")` para que el
// callback de auth (src/auth.ts) pueda exigir y registrar la aceptación al
// autocrear la cuenta -- Google salta el formulario de registro.
export const TERMINOS_COOKIE = "semio_terminos";
export const TERMINOS_COOKIE_MAX_AGE_SECONDS = 10 * 60;

// TODO(legal): completar con los datos societarios reales antes de publicar.
export const TERMINOS_EMPRESA = {
  razonSocial: "[razón social]",
  cuit: "[CUIT]",
  domicilio: "[domicilio]",
};
