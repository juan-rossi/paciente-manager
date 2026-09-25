import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { generarSlots, type WorkScheduleBlockLike } from "@/lib/slots";
import { agruparPorLugar, bloquesDelDia } from "@/lib/bloques-dia";
import { getAperturasDelDia } from "@/lib/horario-excepcional";
import { startOfDayBA } from "@/lib/timezone";

export type BloqueoRango = { lugarId: string | null; inicio: Date; fin: Date };
export type BloqueoRowInput = { lugarId: string | null; inicio: Date; fin: Date };

// `lugarId: null` en un bloqueo significa "aplica a cualquier lugar" (el
// "Día completo" de un médico) -- por eso nunca alcanza con comparar
// `bloqueo.lugarId === lugarId` a secas.
export function isRangoBloqueado(
  slotInicio: Date,
  lugarId: string,
  bloqueos: BloqueoRango[]
): boolean {
  return bloqueos.some(
    (b) =>
      (b.lugarId === null || b.lugarId === lugarId) &&
      slotInicio >= b.inicio &&
      slotInicio < b.fin
  );
}

// Fase 1 (solo calcula, nunca escribe) del "Día completo": el rango de 24hs
// de `fecha`. Separado de `crearBloqueoDia` para poder detectar conflictos
// con turnos existentes ANTES de crear la fila (ver bloqueo-conflictos.ts).
export function resolverRangoDia(lugarId: string | null, fecha: Date): BloqueoRowInput[] {
  const inicio = startOfDayBA(fecha);
  const fin = startOfDayBA(new Date(fecha.getTime() + 24 * 60 * 60 * 1000));
  return [{ lugarId, inicio, fin }];
}

// "Día completo": una sola fila que cubre las 24hs de `fecha`. Para un
// médico, `lugarId: null` (todos sus lugares); para una secretaria, se le
// pasa su `activeLugarId` (nunca puede bloquear un lugar que no administra).
// `db` acepta `prisma` o un `tx` de `$transaction` (ver `registrarAuditoria`
// en audit-log.ts para el mismo patrón) -- se le pasa el `tx` cuando ya se
// resolvieron conflictos con turnos existentes en la misma transacción.
//
// Idempotente: si ya existe una fila IDÉNTICA (mismo lugar y mismo rango
// horario exacto), no crea una segunda -- doble click en "Bloquear",
// reintentar tras un error de red, etc. no deben ir acumulando filas
// redundantes que después "Desbloquear" no sabe limpiar de una (ver
// `dividirBloqueoExcluyendoRango`: partir UNA fila no toca duplicados que
// sigan vivos, cada uno queda bloqueando por su cuenta).
export async function crearBloqueoDia(
  userId: string,
  lugarId: string | null,
  fecha: Date,
  motivo: string | null,
  db: typeof prisma | Prisma.TransactionClient = prisma
) {
  const [rango] = resolverRangoDia(lugarId, fecha);
  const existente = await db.bloqueoHorario.findFirst({
    where: { userId, lugarId, inicio: rango.inicio, fin: rango.fin },
    select: { id: true },
  });
  if (existente) return existente;
  return db.bloqueoHorario.create({ data: { userId, ...rango, motivo } });
}

export class BloqueoSinBloquesError extends Error {}

// Fase 1 (solo calcula, nunca escribe) de "Bloques específicos": nunca
// confía en los rangos horarios que mande el cliente (mismo criterio que
// `buscarSlotValido` en public-booking.ts) -- recalcula los bloques REALES
// de `fecha` server-side a partir del `WorkScheduleBlock` vigente y solo
// devuelve los `bloqueKeys` que matchean uno de verdad. `scopeLugarId` acota
// qué bloques puede ver quien pide el bloqueo: `undefined` para un médico
// (ve todos sus lugares), un id concreto para una secretaria (sus bloques
// nunca van a incluir un lugar que no administra, porque ni siquiera se
// computan).
export async function resolverRangosBloques(
  userId: string,
  scopeLugarId: string | undefined,
  fecha: Date,
  bloqueKeys: string[]
): Promise<BloqueoRowInput[]> {
  const doctor = await prisma.user.findUnique({
    where: { id: userId },
    select: { slotDurationMinutes: true },
  });
  if (!doctor) throw new BloqueoSinBloquesError("Médico no encontrado.");

  const blocks: WorkScheduleBlockLike[] = await prisma.workScheduleBlock.findMany({
    where: { userId, ...(scopeLugarId ? { lugarId: scopeLugarId } : {}) },
  });
  // Si un día quedó habilitado vía "Mover a un día libre" -> "Habilitar
  // turnos nuevos ese día", tiene que poder volver a bloquearse (parcial o
  // totalmente) como cualquier otro -- sin esto, esos bloques ni existen
  // para el recálculo server-side.
  const aperturas = await getAperturasDelDia(userId, fecha, scopeLugarId);
  const slots = generarSlots(fecha, blocks, doctor.slotDurationMinutes, aperturas);
  const slotsIso = slots.map((s) => ({
    inicio: s.inicio.toISOString(),
    fin: s.fin.toISOString(),
    lugarId: s.lugarId,
  }));
  const grupos = agruparPorLugar(slotsIso, []);
  const bloquesReales = bloquesDelDia(grupos);
  const matched = bloquesReales.filter((b) => bloqueKeys.includes(b.key));

  if (matched.length === 0) {
    throw new BloqueoSinBloquesError("Ninguno de los bloques elegidos corresponde a un horario real de ese día.");
  }

  return matched.map((b) => ({ lugarId: b.lugarId, inicio: new Date(b.inicio), fin: new Date(b.fin) }));
}

// Mismo criterio de idempotencia que `crearBloqueoDia` -- filtra los rangos
// que ya tienen una fila idéntica antes del `createMany`, para no dejar
// duplicados exactos si el mismo bloque se vuelve a mandar (reintento,
// doble click, etc.).
//
// Recibe `rangos` YA resueltos (por `resolverRangosBloques`, llamado antes
// en el caller) en vez de volver a resolverlos acá -- esa función hace
// lecturas con el cliente `prisma` de siempre, nunca con `db`/`tx`, y
// llamarla desde acá cuando `db` es una transacción interactiva abierta
// cuelga contra el proxy local de `prisma dev` hasta que esa transacción
// expira (confirmado: "A query cannot be executed on an expired
// transaction" a los ~20s, justo el timeout configurado en la ruta).
export async function crearBloqueosDeBloques(
  userId: string,
  rangos: BloqueoRowInput[],
  motivo: string | null,
  db: typeof prisma | Prisma.TransactionClient = prisma
) {
  const existentes = await db.bloqueoHorario.findMany({
    where: { userId, OR: rangos.map((r) => ({ lugarId: r.lugarId, inicio: r.inicio, fin: r.fin })) },
    select: { lugarId: true, inicio: true, fin: true },
  });
  const nuevos = rangos.filter(
    (r) =>
      !existentes.some(
        (e) =>
          e.lugarId === r.lugarId &&
          e.inicio.getTime() === r.inicio.getTime() &&
          e.fin.getTime() === r.fin.getTime()
      )
  );
  if (nuevos.length === 0) return { count: 0 };
  return db.bloqueoHorario.createMany({
    data: nuevos.map((r) => ({ userId, ...r, motivo })),
  });
}

// Una card "Bloqueado" en la grilla muestra el rango de UN tramo contiguo
// real (ver `agruparBloqueados`/`LugarDayGrid`) -- pero la fila de
// `BloqueoHorario` que la generó puede cubrir mucho más que eso: un "Día
// completo" (`lugarId: null`) aplica a TODOS los lugares del médico y
// siempre cubre las 24hs (ver `resolverRangoDia`), y aunque sea de un solo
// lugar puntual, dos tramos separados por un corte al mediodía (ej. mañana
// 09:00-10:40 y tarde 13:00-16:45) pueden ser en realidad LA MISMA fila --
// la única "Bloqueado" que existe cubre igual las horas muertas del medio.
// "Desbloquear" en UNA card nunca debe levantar el bloqueo de otro lugar NI
// del otro tramo horario del mismo lugar -- se resuelve partiendo la fila
// original: se borra y se recrea, (a) una fila sin cambios por cada OTRO
// lugar del médico que seguía bloqueado (si la original era "Día
// completo"), y (b) para el lugar puntual que pidió desbloquear, lo que
// queda del rango original A LOS COSTADOS del tramo excluido (antes de su
// inicio y/o después de su fin) -- si el tramo excluido era todo lo que
// había, no queda nada y no se recrea ninguna fila para ese lugar.
export async function dividirBloqueoExcluyendoRango(
  bloqueo: { id: string; userId: string; lugarId: string | null; inicio: Date; fin: Date; motivo: string | null },
  lugarId: string,
  rango: { inicio: Date; fin: Date }
) {
  const nuevasFilas: { userId: string; lugarId: string; inicio: Date; fin: Date; motivo: string | null }[] = [];

  if (bloqueo.lugarId === null) {
    const otrosLugares = await prisma.lugarDeTrabajo.findMany({
      where: { userId: bloqueo.userId, deletedAt: null, id: { not: lugarId } },
      select: { id: true },
    });
    for (const l of otrosLugares) {
      nuevasFilas.push({
        userId: bloqueo.userId,
        lugarId: l.id,
        inicio: bloqueo.inicio,
        fin: bloqueo.fin,
        motivo: bloqueo.motivo,
      });
    }
  }

  if (bloqueo.inicio < rango.inicio) {
    nuevasFilas.push({
      userId: bloqueo.userId,
      lugarId,
      inicio: bloqueo.inicio,
      fin: rango.inicio,
      motivo: bloqueo.motivo,
    });
  }
  if (rango.fin < bloqueo.fin) {
    nuevasFilas.push({
      userId: bloqueo.userId,
      lugarId,
      inicio: rango.fin,
      fin: bloqueo.fin,
      motivo: bloqueo.motivo,
    });
  }

  // Mismo criterio de idempotencia que `crearBloqueoDia`/
  // `crearBloqueosDeBloques` -- si ya existe otra fila (ej. un duplicado
  // viejo de la misma fila que se está partiendo) con exactamente el mismo
  // lugar y rango que una de las que se van a recrear, no se la duplica.
  const existentes =
    nuevasFilas.length > 0
      ? await prisma.bloqueoHorario.findMany({
          where: {
            userId: bloqueo.userId,
            id: { not: bloqueo.id },
            OR: nuevasFilas.map((f) => ({ lugarId: f.lugarId, inicio: f.inicio, fin: f.fin })),
          },
          select: { lugarId: true, inicio: true, fin: true },
        })
      : [];
  const filasAInsertar = nuevasFilas.filter(
    (f) =>
      !existentes.some(
        (e) => e.lugarId === f.lugarId && e.inicio.getTime() === f.inicio.getTime() && e.fin.getTime() === f.fin.getTime()
      )
  );

  await prisma.$transaction([
    prisma.bloqueoHorario.delete({ where: { id: bloqueo.id } }),
    ...(filasAInsertar.length > 0 ? [prisma.bloqueoHorario.createMany({ data: filasAInsertar })] : []),
  ]);
}
