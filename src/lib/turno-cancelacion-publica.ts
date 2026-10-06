import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Una cookie por médico: reservar con dos médicos distintos funciona.
export function nombreCookieTurno(slug: string): string {
  return `turno_${slug}`;
}

export function generarTokenCancelacion(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Dura hasta el fin del turno: pasado eso ya no hay nada que cancelar.
export function opcionesCookieTurno(fin: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: fin,
  };
}

// El turno de la cookie, solo si sigue vigente: confirmado, de ESTE médico y
// con inicio en el futuro. Cualquier otra cosa (turno pasado, cancelado,
// cookie inventada o de otro médico) devuelve null y el perfil no muestra nada.
export async function getTurnoActivoDelVisitante(doctorId: string, slug: string) {
  const token = (await cookies()).get(nombreCookieTurno(slug))?.value;
  if (!token) return null;
  return buscarTurnoPorToken(doctorId, token);
}

export async function buscarTurnoPorToken(doctorId: string, token: string) {
  return prisma.turno.findFirst({
    where: {
      cancelTokenHash: hashToken(token),
      doctorId,
      estado: "CONFIRMADO",
      inicio: { gt: new Date() },
    },
    select: {
      id: true,
      inicio: true,
      fin: true,
      lugar: { select: { nombre: true, direccion: true } },
    },
  });
}

// Versión lista para pasar al componente cliente del perfil (fechas en ISO).
export async function getTurnoVigenteParaPerfil(doctorId: string, slug: string) {
  const turno = await getTurnoActivoDelVisitante(doctorId, slug);
  if (!turno) return null;
  return {
    inicio: turno.inicio.toISOString(),
    lugarNombre: turno.lugar.nombre ?? "Consulta particular",
    direccion: turno.lugar.direccion,
  };
}
