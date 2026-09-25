import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { BloqueoRango, BloqueoRowInput } from "@/lib/bloqueo-horario";
import { generarSlots, type WorkScheduleBlockLike } from "@/lib/slots";
import { agruparPorLugar, bloquesDelDia } from "@/lib/bloques-dia";
import { planReschedule } from "@/lib/schedule-reschedule";
import { buscarProximosDiasLibres } from "@/lib/dia-sin-configurar";
import { formatDateParamBA, getMinutesSinceMidnightBA, setTimeBA, startOfDayBA } from "@/lib/timezone";

export type ConflictoTurno = {
  id: string;
  nombreYApellido: string;
  inicio: Date;
  fin: Date;
  lugarId: string;
};

// Turnos CONFIRMADO cuyo `inicio` cae dentro de alguno de los rangos que se
// está por bloquear -- mismo criterio de matching que `isRangoBloqueado`
// (un rango con `lugarId: null` es "Día completo" de un médico y aplica a
// CUALQUIER lugar suyo, por eso ese caso no filtra por `lugarId` en el
// where). Se vuelve a calcular en cada llamada del endpoint: nunca se
// confía en una lista de turnos que mande el cliente.
export async function detectarConflictos(
  tenantId: string,
  rangos: BloqueoRowInput[]
): Promise<ConflictoTurno[]> {
  if (rangos.length === 0) return [];
  const turnos = await prisma.turno.findMany({
    where: {
      doctorId: tenantId,
      estado: "CONFIRMADO",
      OR: rangos.map((r) => ({
        inicio: { gte: r.inicio, lt: r.fin },
        ...(r.lugarId ? { lugarId: r.lugarId } : {}),
      })),
    },
    select: { id: true, nombreYApellido: true, inicio: true, fin: true, lugarId: true },
    orderBy: { inicio: "asc" },
  });
  return turnos;
}

export type ResolucionConflicto = "cancelar" | "mover_dia_libre" | "mover_siguiente_libre";

export class SinDiaLibreError extends Error {}
export class SinHorarioDisponibleError extends Error {}
export class DiaLibreInvalidoError extends Error {}

export type BloqueConflicto = {
  key: string; // mismo formato que BloqueDelDia.key: `${lugarId}-${isoInicio}`
  lugarId: string;
  inicio: Date;
  fin: Date;
  turnos: ConflictoTurno[];
};

// Agrupa los conflictos planos de `detectarConflictos` en los bloques de
// horario REALES a los que pertenecen -- ej. "Consulta particular
// 09:00-10:15" y "Consulta particular 13:50-16:15" son dos bloques
// distintos aunque compartan lugar. Se reusa tanto para armar la respuesta
// 409 (un paso del wizard por bloque) como dentro de `resolverConflictos`.
// Por construcción, un bloque devuelto acá siempre tiene al menos 1 turno
// (nace de agrupar turnos reales, nunca al revés).
export function agruparConflictosPorBloque(
  fecha: Date,
  conflictos: ConflictoTurno[],
  blocks: WorkScheduleBlockLike[],
  slotDurationMinutes: number
): BloqueConflicto[] {
  const porLugar = new Map<string, ConflictoTurno[]>();
  for (const turno of conflictos) {
    const lista = porLugar.get(turno.lugarId) ?? [];
    lista.push(turno);
    porLugar.set(turno.lugarId, lista);
  }

  const resultado: BloqueConflicto[] = [];
  for (const [lugarId, turnosDelLugar] of porLugar) {
    const blocksDelLugar = blocks.filter((b) => b.lugarId === lugarId);
    const slots = generarSlots(fecha, blocksDelLugar, slotDurationMinutes);
    const slotsIso = slots.map((s) => ({
      inicio: s.inicio.toISOString(),
      fin: s.fin.toISOString(),
      lugarId: s.lugarId,
    }));
    const bloquesReales = bloquesDelDia(agruparPorLugar(slotsIso, []));

    const porBloqueKey = new Map<string, BloqueConflicto>();
    for (const turno of turnosDelLugar) {
      const bloque = bloquesReales.find(
        (b) => new Date(b.inicio) <= turno.inicio && turno.inicio < new Date(b.fin)
      );
      // Un turno sin bloque real que lo contenga (caso raro, ej. un
      // sobreturno fuera de grilla) se trata como su propio bloque de 1.
      const key = bloque ? bloque.key : `turno-${turno.id}`;
      const existente = porBloqueKey.get(key);
      if (existente) {
        existente.turnos.push(turno);
      } else {
        porBloqueKey.set(key, {
          key,
          lugarId,
          inicio: bloque ? new Date(bloque.inicio) : turno.inicio,
          fin: bloque ? new Date(bloque.fin) : turno.fin,
          turnos: [turno],
        });
      }
    }
    resultado.push(...porBloqueKey.values());
  }

  return resultado.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

export type CandidatosDiaLibre = { lugarId: string; fechas: Date[] };

// Para el paso 2 del diálogo: los próximos 10 días sin horario configurado
// de CADA lugar afectado, para que el usuario elija a cuál mover -- se
// manda en la respuesta 409 (ver la ruta), nunca se escribe nada acá.
export async function prepararCandidatosDiasLibres(
  tenantId: string,
  conflictos: ConflictoTurno[]
): Promise<CandidatosDiaLibre[]> {
  const lugares = [...new Set(conflictos.map((c) => c.lugarId))];
  const hoy = startOfDayBA(new Date());
  return Promise.all(
    lugares.map(async (lugarId) => ({
      lugarId,
      fechas: await buscarProximosDiasLibres(tenantId, lugarId, hoy),
    }))
  );
}

// El usuario ya eligió una fecha por BLOQUE en el paso 2 (dos bloques del
// mismo lugar pueden elegir días libres distintos) -- nunca se confía en lo
// que mande el cliente (podría no ser un día real sin configurar, o ya
// haber pasado): se recalculan los candidatos reales de cada lugar acá y se
// verifica que la fecha elegida esté entre ellos. `buscarProximosDiasLibres`
// se memoiza por `lugarId` porque dos bloques pueden compartir lugar. Tiene
// que resolverse ANTES de abrir la transacción -- mezclar una consulta con
// el cliente `prisma` normal (no `tx`) mientras hay una transacción
// interactiva abierta en el mismo pool puede colgarse (confirmado contra el
// proxy local de `prisma dev`; en el pool pooled de producción no debería
// pasar, pero tampoco hace falta correr el riesgo).
export async function validarDiasLibreElegidos(
  tenantId: string,
  bloques: { key: string; lugarId: string }[],
  elegidos: { bloqueKey: string; fecha: string }[]
): Promise<Map<string, Date>> {
  const hoy = startOfDayBA(new Date());
  const candidatosPorLugar = new Map<string, Date[]>();
  const resultado = new Map<string, Date>();

  for (const bloque of bloques) {
    const fechaElegida = elegidos.find((e) => e.bloqueKey === bloque.key)?.fecha;
    if (!fechaElegida) {
      throw new DiaLibreInvalidoError("Elegí a qué día mover estos turnos.");
    }
    let candidatos = candidatosPorLugar.get(bloque.lugarId);
    if (!candidatos) {
      candidatos = await buscarProximosDiasLibres(tenantId, bloque.lugarId, hoy);
      candidatosPorLugar.set(bloque.lugarId, candidatos);
    }
    const match = candidatos.find((c) => formatDateParamBA(c) === fechaElegida);
    if (!match) {
      throw new DiaLibreInvalidoError(
        "Ese día ya no es una opción válida -- elegí otro de la lista."
      );
    }
    resultado.set(bloque.key, match);
  }

  return resultado;
}

export type ResolucionPorBloque = {
  bloqueKey: string;
  resolucion: ResolucionConflicto;
  // Solo aplican con "mover_dia_libre".
  horariosConsecutivos?: boolean;
  habilitarTurnosNuevos?: boolean;
};

// Aplica la resolución que el usuario eligió PARA CADA BLOQUE (wizard por
// bloque, ver turnos-calendar.tsx) -- vía `tx`, dentro de la misma
// transacción que después crea las filas de `BloqueoHorario`, para que todo
// se confirme (o revierta) junto.
//
// "mover_siguiente_libre" es la única resolución que NO se resuelve bloque
// por bloque: se sigue agrupando por `lugarId` (juntando los turnos de
// TODOS los bloques de ese lugar que hayan elegido esta resolución) porque
// `planReschedule` usa un `usedSlots` local a cada llamada -- si dos
// bloques hermanos del mismo lugar se resolvieran con llamadas separadas,
// cada una podría reservarle a un paciente distinto el mismo slot libre sin
// que la otra lo supiera (doble reserva). "cancelar" y "mover_dia_libre" sí
// son genuinamente por bloque.
export async function resolverConflictos(
  tx: Prisma.TransactionClient,
  tenantId: string,
  bloques: BloqueConflicto[],
  resoluciones: ResolucionPorBloque[],
  contexto: {
    blocks: WorkScheduleBlockLike[];
    slotDurationMinutes: number;
    bloqueosVigentes: BloqueoRango[];
    // Obligatorio para los bloques con "mover_dia_libre" -- ver
    // `validarDiasLibreElegidos`. Keyed por `bloque.key`, no por lugarId.
    diasLibrePorBloque?: Map<string, Date>;
  }
): Promise<void> {
  const resolucionPorKey = new Map(resoluciones.map((r) => [r.bloqueKey, r]));
  function resolucionDe(bloque: BloqueConflicto): ResolucionPorBloque {
    const r = resolucionPorKey.get(bloque.key);
    if (!r) throw new DiaLibreInvalidoError("Falta la resolución de uno de los bloques.");
    return r;
  }

  for (const bloque of bloques) {
    if (resolucionDe(bloque).resolucion !== "cancelar") continue;
    for (const turno of bloque.turnos) {
      await tx.turno.update({
        where: { id: turno.id },
        data: { estado: "CANCELADO", avisoPendiente: true, avisoPendienteMotivo: "CANCELADO" },
      });
    }
  }

  for (const bloque of bloques) {
    const r = resolucionDe(bloque);
    if (r.resolucion !== "mover_dia_libre") continue;

    const diaLibre = contexto.diasLibrePorBloque?.get(bloque.key);
    if (!diaLibre) {
      throw new SinDiaLibreError(
        "No hay ningún día sin horario configurado para reprogramar estos turnos."
      );
    }
    const horariosConsecutivos = r.horariosConsecutivos ?? false;
    const habilitarTurnosNuevos = r.habilitarTurnosNuevos ?? true;
    const minutosInicioBloque = getMinutesSinceMidnightBA(bloque.inicio);
    const minutosFinBloque = getMinutesSinceMidnightBA(bloque.fin);

    if (horariosConsecutivos) {
      const ordenados = [...bloque.turnos].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
      let cursor = setTimeBA(diaLibre, Math.floor(minutosInicioBloque / 60), minutosInicioBloque % 60);
      for (const turno of ordenados) {
        const duracionMs = turno.fin.getTime() - turno.inicio.getTime();
        const nuevoInicio = new Date(cursor);
        const nuevoFin = new Date(cursor.getTime() + duracionMs);
        await tx.turno.update({
          where: { id: turno.id },
          data: {
            inicio: nuevoInicio,
            fin: nuevoFin,
            avisoPendiente: true,
            avisoPendienteMotivo: "APLAZADO",
            avisoPendienteFechaAnterior: turno.inicio,
          },
        });
        cursor = nuevoFin;
      }
    } else {
      for (const turno of bloque.turnos) {
        const duracionMs = turno.fin.getTime() - turno.inicio.getTime();
        const minutos = getMinutesSinceMidnightBA(turno.inicio);
        const nuevoInicio = setTimeBA(diaLibre, Math.floor(minutos / 60), minutos % 60);
        const nuevoFin = new Date(nuevoInicio.getTime() + duracionMs);
        await tx.turno.update({
          where: { id: turno.id },
          data: {
            inicio: nuevoInicio,
            fin: nuevoFin,
            avisoPendiente: true,
            avisoPendienteMotivo: "APLAZADO",
            avisoPendienteFechaAnterior: turno.inicio,
          },
        });
      }
    }

    if (habilitarTurnosNuevos) {
      const aperturaInicio = setTimeBA(diaLibre, Math.floor(minutosInicioBloque / 60), minutosInicioBloque % 60);
      const aperturaFin = setTimeBA(diaLibre, Math.floor(minutosFinBloque / 60), minutosFinBloque % 60);
      await tx.horarioExcepcional.create({
        data: { userId: tenantId, lugarId: bloque.lugarId, inicio: aperturaInicio, fin: aperturaFin },
      });
    }
  }

  // "mover_siguiente_libre": ver comentario arriba -- se agrupa por
  // `lugarId`, juntando los turnos de todos los bloques de ese lugar que
  // hayan elegido esta resolución, y se llama `planReschedule` una sola vez
  // por lugar (ya sabe saltear `bloqueosVigentes` y buscar hacia adelante
  // hasta 120 días).
  const porLugarSiguienteLibre = new Map<string, ConflictoTurno[]>();
  for (const bloque of bloques) {
    if (resolucionDe(bloque).resolucion !== "mover_siguiente_libre") continue;
    const lista = porLugarSiguienteLibre.get(bloque.lugarId) ?? [];
    lista.push(...bloque.turnos);
    porLugarSiguienteLibre.set(bloque.lugarId, lista);
  }
  for (const [lugarId, turnosDelLugar] of porLugarSiguienteLibre) {
    const blocksDelLugar = contexto.blocks.filter((b) => b.lugarId === lugarId);
    const { plan, sinSolucion } = planReschedule(
      turnosDelLugar.map((t) => ({ id: t.id, nombreYApellido: t.nombreYApellido, inicio: t.inicio })),
      blocksDelLugar,
      contexto.slotDurationMinutes,
      contexto.bloqueosVigentes
    );
    if (sinSolucion.length > 0) {
      throw new SinHorarioDisponibleError(
        `No se encontró horario disponible para ${sinSolucion.length} turno${sinSolucion.length === 1 ? "" : "s"}.`
      );
    }
    for (const item of plan) {
      await tx.turno.update({
        where: { id: item.turnoId },
        data: {
          inicio: item.newInicio,
          fin: item.newFin,
          avisoPendiente: true,
          avisoPendienteMotivo: "APLAZADO",
          avisoPendienteFechaAnterior: item.oldInicio,
        },
      });
    }
  }
}
