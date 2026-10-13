import { z } from "zod";

// DNI argentino: solo dígitos, al menos 7, sin puntos ni letras. Único lugar
// donde vive esta regla -- todo schema que valide un DNI (paciente, turno,
// sobreturno, reserva pública) importa esto en vez de inventar su propia
// regex, para no terminar con criterios distintos en cada formulario.
export const DNI_REGEX = /^\d{7,}$/;
export const DNI_ERROR_MESSAGE = "El DNI debe tener solo números y al menos 7 dígitos.";

export const dniSchema = z.string().trim().regex(DNI_REGEX, DNI_ERROR_MESSAGE);
