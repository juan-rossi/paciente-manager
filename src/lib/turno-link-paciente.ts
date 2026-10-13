import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

// Links `{confirmar}`/`{cancelar}` del recordatorio de WhatsApp. Lo más
// cortos posible: `semio360.com/t/<código>/si` y `/no`. El código es
// aleatorio (8 caracteres alfanuméricos, ~47 bits) y está rate-limiteado
// en la página, así que no se puede barrer.
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const LARGO_CODIGO = 8;
export const LINK_CODIGO_REGEX = /^[A-Za-z0-9]{8}$/;

export type AccionLinkPaciente = "si" | "no";

function generarLinkCodigo(): string {
  let codigo = "";
  for (let i = 0; i < LARGO_CODIGO; i++) codigo += ALFABETO[randomInt(ALFABETO.length)];
  return codigo;
}

// Sin "https://": WhatsApp igual lo detecta como link y son 8 caracteres
// menos por link. Fuera de https (local) se deja el protocolo, porque
// `localhost:3000/...` no lo reconoce.
export function linkPaciente(codigo: string, accion: AccionLinkPaciente): string {
  return `${getSiteUrl().replace(/^https:\/\//, "")}/t/${codigo}/${accion}`;
}

// Le asigna código a los turnos que todavía no tienen. Se llama al armar la
// lista de Recordatorios: así cubre los turnos creados por cualquier camino
// (panel, sobreturno, reserva online) sin tocar cada uno. Devuelve el código
// de cada turno por id.
export async function asegurarLinkCodigos(
  turnos: { id: string; linkCodigo: string | null }[]
): Promise<Map<string, string>> {
  const codigos = new Map<string, string>();
  for (const turno of turnos) {
    if (turno.linkCodigo) {
      codigos.set(turno.id, turno.linkCodigo);
      continue;
    }
    // Una colisión del índice único es astronómicamente improbable, pero
    // reintentar es gratis. `linkCodigo: null` en el where evita pisar el
    // código que otra request haya asignado en paralelo.
    for (let intento = 0; intento < 3; intento++) {
      const codigo = generarLinkCodigo();
      try {
        await prisma.turno.updateMany({ where: { id: turno.id, linkCodigo: null }, data: { linkCodigo: codigo } });
        break;
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002" || intento === 2) throw error;
      }
    }
    const { linkCodigo } = await prisma.turno.findUniqueOrThrow({
      where: { id: turno.id },
      select: { linkCodigo: true },
    });
    codigos.set(turno.id, linkCodigo!);
  }
  return codigos;
}

export async function buscarTurnoPorLinkCodigo(codigo: string) {
  if (!LINK_CODIGO_REGEX.test(codigo)) return null;
  return prisma.turno.findUnique({
    where: { linkCodigo: codigo },
    select: {
      id: true,
      inicio: true,
      estado: true,
      confirmadoAt: true,
      doctorId: true,
      lugarId: true,
      lugar: { select: { nombre: true, direccion: true, ciudad: true } },
      doctor: { select: { nombre: true, tituloCortesia: true } },
    },
  });
}
