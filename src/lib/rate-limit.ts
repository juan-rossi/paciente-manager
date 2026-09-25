import { prisma } from "@/lib/prisma";

type Ruta = "reservar" | "disponibilidad";

// `porIp` frena a una sola fuente que ataque a cualquier médico; `porSlug`
// protege a UN médico puntual de que le llenen la agenda aunque el
// atacante rote de IP. "disponibilidad" es solo lectura -- límite mucho
// más generoso, alcanza con frenar scraping/DoS trivial, no hace falta
// tan estricto como "reservar" (que sí escribe un turno).
const LIMITES: Record<Ruta, { porIp: number; porSlug: number; ventanaMinutos: number }> = {
  reservar: { porIp: 5, porSlug: 20, ventanaMinutos: 15 },
  disponibilidad: { porIp: 60, porSlug: 300, ventanaMinutos: 15 },
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
