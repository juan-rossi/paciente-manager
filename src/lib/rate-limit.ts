import { prisma } from "@/lib/prisma";

// "recuperar" (olvidé mi contraseña), "login" y "registro" usan el email
// como `slug`: así el límite por "slug" frena un ataque contra una cuenta
// puntual (adivinar su contraseña, llenarle la casilla de mails) aunque el
// atacante rote de IP.
// "ciudad" (autocomplete/detalle de ciudades del directorio, ambos contra
// Google Places pago) usa un `slug` fijo: el límite por "slug" pasa a ser
// un tope global de la cuota aunque el atacante rote de IP.
// "link-turno" (links `{confirmar}`/`{cancelar}` del recordatorio) usa el
// código del link como `slug`.
type Ruta =
  | "reservar"
  | "disponibilidad"
  | "cancelar"
  | "recuperar"
  | "login"
  | "registro"
  | "ciudad"
  | "link-turno"
  | "exportar"
  | "soporte-mensaje"
  | "invitar";

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
  // Solo por IP (en un consultorio varias personas entran desde la misma IP,
  // por eso es generoso). Por email NO se bloquea: contar todos los intentos
  // dejaba que cualquiera le trabara el login a un médico mandando 8 pedidos
  // con su email. Por email se cuentan solo los FALLIDOS y, pasado un umbral,
  // se pide Turnstile en vez de bloquear (ver `loginRequiereVerificacion`).
  login: { porIp: 20, porSlug: Number.POSITIVE_INFINITY, ventanaMinutos: 15 },
  registro: { porIp: 5, porSlug: 3, ventanaMinutos: 60 },
  // El autocomplete ya tiene debounce en el cliente: 60 por IP alcanza para
  // varias búsquedas reales seguidas. El tope global (slug fijo) acota el
  // gasto de la key paga de Google aunque se roten IPs: 500 cada 15 min
  // (~48.000 por día). Además conviene una cuota en Google Cloud.
  ciudad: { porIp: 60, porSlug: 500, ventanaMinutos: 15 },
  // Abrir el link + tocar el botón son 2 intentos; un paciente real no pasa
  // de unos pocos. Por IP frena que alguien barra códigos al azar.
  "link-turno": { porIp: 30, porSlug: 20, ventanaMinutos: 15 },
  // Export de HC (ver `exportar-historia-clinica.ts`): "ip" es el id de
  // quien descarga y "slug" el médico. Recorre la base entera de la cuenta:
  // un médico real no necesita más de un par de copias por hora.
  exportar: { porIp: 3, porSlug: 5, ventanaMinutos: 60 },
  // Respuestas a un ticket de soporte: "ip" es el autor y "slug" el ticket.
  // Cada respuesta reabre el ticket y avisa al equipo.
  "soporte-mensaje": { porIp: 30, porSlug: 20, ventanaMinutos: 60 },
  // Invitar asistentes (POST /api/users): "ip" y "slug" son el médico. Un
  // consultorio real invita a unas pocas personas; el tope frena usar el
  // formulario para averiguar en masa qué emails tienen cuenta.
  invitar: { porIp: 20, porSlug: 20, ventanaMinutos: 60 },
};

// La ventana más larga de LIMITES es de 60 minutos: lo anterior a un día no
// se usa para nada. Se borra "de paso" (no hay cron), en ~1 de cada 100
// chequeos y de a lotes acotados para no demorar ese pedido.
const PROBABILIDAD_LIMPIEZA = 0.01;
const LOTE_LIMPIEZA = 5000;

async function limpiarIntentosViejosDePaso() {
  if (Math.random() >= PROBABILIDAD_LIMPIEZA) return;
  const limite = new Date(Date.now() - 24 * 60 * 60_000);
  try {
    await prisma.$executeRaw`DELETE FROM "IntentoReserva" WHERE id IN (SELECT id FROM "IntentoReserva" WHERE "createdAt" < ${limite} LIMIT ${LOTE_LIMPIEZA})`;
  } catch (error) {
    // Nunca hace fallar el pedido que la disparó.
    console.error("[rate-limit] no se pudo limpiar IntentoReserva", error);
  }
}

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
  await limpiarIntentosViejosDePaso();

  return porIpCount < porIp && porSlugCount < porSlug;
}

// --- Login: intentos fallidos por email ---------------------------------
// "login-fallido" solo se registra cuando la contraseña no coincide (o el
// email no existe). Pasado el umbral, el login de ese email exige Turnstile:
// frena la fuerza bruta contra una cuenta sin dejar afuera a su dueño.
const RUTA_LOGIN_FALLIDO = "login-fallido";
const FALLIDOS_ANTES_DE_VERIFICAR = 5;
const VENTANA_FALLIDOS_MINUTOS = 15;

export async function registrarLoginFallido(ip: string, email: string) {
  await prisma.intentoReserva.create({ data: { ip, slug: email, ruta: RUTA_LOGIN_FALLIDO } });
}

export async function loginRequiereVerificacion(email: string): Promise<boolean> {
  const desde = new Date(Date.now() - VENTANA_FALLIDOS_MINUTOS * 60_000);
  const fallidos = await prisma.intentoReserva.count({
    where: { slug: email, ruta: RUTA_LOGIN_FALLIDO, createdAt: { gte: desde } },
  });
  return fallidos >= FALLIDOS_ANTES_DE_VERIFICAR;
}
