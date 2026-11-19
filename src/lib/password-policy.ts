// Largo mínimo de una contraseña NUEVA (alta, restablecer, cambio, activar
// una invitación). Las contraseñas existentes más cortas siguen funcionando
// para ingresar: el mínimo solo se exige al elegir una. Sin dependencias de
// servidor: lo usan también los formularios del navegador.
export const PASSWORD_MIN = 10;

export const MENSAJE_PASSWORD_MIN = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
