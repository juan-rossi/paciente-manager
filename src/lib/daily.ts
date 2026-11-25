// Cliente mínimo de la API REST de Daily.co (https://docs.daily.co/reference/rest-api)
// para la teleconsulta. Se usa Daily Prebuilt embebido en un iframe, así que
// no hace falta su SDK de navegador: solo crear la sala y un token por
// persona desde el servidor.
//
// Variables de entorno:
// - DAILY_API_KEY: la API key del dashboard de Daily (Developers).
// - DAILY_DOMAIN: el subdominio de la cuenta (`<DAILY_DOMAIN>.daily.co`),
//   lo usa también next.config.ts para habilitar el iframe y la cámara.

const API = "https://api.daily.co/v1";

export class DailyNoConfiguradoError extends Error {
  constructor() {
    super("La videollamada no está configurada (falta DAILY_API_KEY).");
  }
}

export function dailyConfigurado(): boolean {
  return Boolean(process.env.DAILY_API_KEY);
}

async function dailyFetch<T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T }> {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new DailyNoConfiguradoError();
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T;
  return { ok: response.ok, status: response.status, data };
}

const segundos = (date: Date) => Math.floor(date.getTime() / 1000);

type Room = { name: string; url: string };

/**
 * Crea (o recupera, si ya existe) la sala privada de un turno. Sin
 * grabación ni transcripción: el video de la consulta nunca se guarda.
 * `desde`/`hasta` acotan cuándo se puede entrar; al llegar `hasta` Daily
 * saca a todos y la sala deja de servir.
 */
export async function asegurarSala(nombre: string, desde: Date, hasta: Date): Promise<Room> {
  const creada = await dailyFetch<Room & { info?: string; error?: string }>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name: nombre,
      privacy: "private",
      properties: {
        nbf: segundos(desde),
        exp: segundos(hasta),
        eject_at_room_exp: true,
        max_participants: 4,
        enable_prejoin_ui: true,
        enable_chat: true,
        enable_screenshare: true,
        lang: "es",
      },
    }),
  });
  if (creada.ok) return { name: creada.data.name, url: creada.data.url };

  // Ya existía (otra persona del turno entró antes): se usa la misma.
  const existente = await dailyFetch<Room>(`/rooms/${encodeURIComponent(nombre)}`);
  if (existente.ok) return { name: existente.data.name, url: existente.data.url };

  throw new Error(`Daily: no se pudo crear la sala (${creada.status} ${creada.data.info ?? creada.data.error ?? ""}).`);
}

/**
 * Token de acceso de una persona a una sala privada. `esMedico` lo hace
 * dueño (puede sacar participantes, silenciar, etc.).
 */
export async function crearTokenSala(opciones: {
  sala: string;
  nombreVisible: string;
  esMedico: boolean;
  hasta: Date;
}): Promise<string> {
  const { ok, status, data } = await dailyFetch<{ token?: string; info?: string }>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: opciones.sala,
        user_name: opciones.nombreVisible,
        is_owner: opciones.esMedico,
        exp: segundos(opciones.hasta),
        lang: "es",
      },
    }),
  });
  if (!ok || !data.token) throw new Error(`Daily: no se pudo crear el token (${status} ${data.info ?? ""}).`);
  return data.token;
}
