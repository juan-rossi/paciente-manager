import Image from "../opengraph-image";

export const alt = "Turnos online en Semio360";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Misma tarjeta que el perfil del médico: sin esto, el link por lugar que se
// comparte por WhatsApp saldría sin imagen (la del perfil no se hereda).
export default Image;
