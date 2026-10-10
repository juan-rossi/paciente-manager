import { prisma } from "@/lib/prisma";

// "recuperar" (olvidé mi contraseña), "login" y "registro" usan el email
// como `slug`: así el límite por "slug" frena un ataque contra una cuenta
// puntual (adivinar su contraseña, llenarle la casilla de mails) aunque el
// atacante rote de IP.
// "ciudad" (autocomplete/detalle de ciudades del directorio, ambos contra
// Google Places pago) usa un `slug` fijo: el límite por "slug" pasa a ser
// un tope global de la cuota aunque el atacante rote de IP.
type Ruta = "reservar" | "disponibilidad" | "cancelar" | "recuperar" | "login" | "registro" | "ciudad";

// `porIp` frena a una sola fuente que ataque a cualquier médico; `porSlug`
// protege a UN médico puntual de que le llenen la agenda aunque el
// atacante rote de IP. "disponibilidad" es solo lectura -- límite mucho
// más generoso, alcanza con frenar scraping/DoS trivial, no hace falta
// tan estricto como "reservar" (que sí escribe un turno).
const LIMITES: Record<Ruta, { porIp: number; porSlug: number; ventanaMinutos: number }> = {
  reservar: { porIp: 5, porSlug: 20, ventanaMinutos: 15 },
  disponibilidad: { porIp: 60, porSlug: 300, ventanaMinutos: 15 },
  cancelar: { porIp: 10, porSlug: 60, ventanaMinutos: 15 },
  recuperar: { porIp: 5, porSlug: 3, ventanaMinutos: 15 },
  // Por IP es más generoso que por email porque en un consultorio varias
  // personas (médico + secretarias) entran desde la misma IP. El límite por
  // email cuenta todos los intentos, no solo los fallidos: un usuario real
  // no necesita 8 logins en 15 minutos.
  login: { porIp: 20, porSlug: 8, ventanaMinutos: 15 },
  registro: { porIp: 5, porSlug: 3, ventanaMinutos: 60 },
  // El autocomplete ya tiene debounce en el cliente: 60 por IP alcanza para
  // varias búsquedas reales seguidas.
  ciudad: { porIp: 60, porSlug: 2000, ventanaMinutos: 15 },
};

// Rate limiting de la reserva pública del directorio, sobre Postgres (ver
// `IntentoReserva` en el schema) -- no hay Redis/Upstash en el stack, y el
// volumen de un directorio de pocos médicos no lo justifica. Devuelve
// `true` si la request está permitida. Siempre registra el intento
// (permitido o no) ANTES de decidir, para que un reintento inmediato tras
// ser bloqueado también sume al límite en vez de poder reintentar gratis.
export async function rateLimitOk(ip: string, slug: string, ruta: Ruta): Promise<boolean> {
  const { porIp, porSlug, ventanaMinutos } = LIMITES[ruta];
  const desde = new Date(Date.now() - ventanaMinutos * 60_000);

  const [porIpCount, porSlugCount] = await Promise.all([
    prisma.intentoReserva.count({ where: { ip, ruta, createdAt: { gte: desde } } }),
    prisma.intentoReserva.count({ where: { slug, ruta, createdAt: { gte: desde } } }),
  ]);
  await prisma.intentoReserva.create({ data: { ip, slug, ruta } });

  return porIpCount < porIp && porSlugCount < porSlug;
}
