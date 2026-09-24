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

// El usuario ya eligió una fecha por lugar en el paso 2 -- nunca se confía
// en lo que mande el cliente (podría no ser un día real sin configurar, o
// ya haber pasado): se recalculan los candidatos reales de cada lugar acá y
// se verifica que la fecha elegida esté entre ellos. Tiene que resolverse
// ANTES de abrir la transacción -- mezclar una consulta con el cliente
// `prisma` normal (no `tx`) mientras hay una transacción interactiva
// abierta en el mismo pool puede colgarse (confirmado contra el proxy
// local de `prisma dev`; en el pool pooled de producción no debería pasar,
// pero tampoco hace falta correr el riesgo).
export async function validarDiasLibreElegidos(
  tenantId: string,
  conflictos: ConflictoTurno[],
  elegidos: { lugarId: string; fecha: string }[]
): Promise<Map<string, Date>> {
  const lugares = [...new Set(conflictos.map((c) => c.lugarId))];
  const hoy = startOfDayBA(new Date());
  const resultado = new Map<string, Date>();

  for (const lugarId of lugares) {
    const fechaElegida = elegidos.find((e) => e.lugarId === lugarId)?.fecha;
    if (!fechaElegida) {
      throw new DiaLibreInvalidoError("Elegí a qué día mover estos turnos.");
    }
    const candidatos = await buscarProximosDiasLibres(tenantId, lugarId, hoy);
    const match = candidatos.find((c) => formatDateParamBA(c) === fechaElegida);
    if (!match) {
      throw new DiaLibreInvalidoError(
        "Ese día ya no es una opción válida -- elegí otro de la lista."
      );
    }
    resultado.set(lugarId, match);
  }

  return resultado;
}

// Aplica la resolución elegida por el usuario a los turnos en conflicto,
// vía `tx` -- se llama dentro de la misma transacción que después crea las
// filas de `BloqueoHorario`, para que todo se confirme (o revierta) junto.
// Agrupa por `lugarId` antes de resolver "mover_dia_libre"/
// "mover_siguiente_libre": un bloqueo "Día completo" puede afectar turnos
// de más de un lugar del médico, y tanto el día sin configurar como el
// próximo horario libre son cosas propias de CADA lugar, nunca globales
// (mover un turno de "Consulta particular" no debería poder terminar en un
// horario de "Devlights").
export async function resolverConflictos(
  tx: Prisma.TransactionClient,
  tenantId: string,
  conflictos: ConflictoTurno[],
  resolucion: ResolucionConflicto,
  contexto: {
    blocks: WorkScheduleBlockLike[];
    slotDurationMinutes: number;
    bloqueosVigentes: BloqueoRango[];
    // Obligatorios para "mover_dia_libre" -- ver `validarDiasLibreElegidos`.
    diasLibrePorLugar?: Map<string, Date | null>;
    // "Horarios consecutivos": en vez de que cada turno conserve su propia
    // hora, se acomodan uno tras otro arrancando en el inicio del bloque
    // de horarios ORIGINAL (transplantado a `diaLibre`).
    horariosConsecutivos?: boolean;
    // "Habilitar turnos nuevos ese día": además de mover los turnos, crea
    // una `HorarioExcepcional` que cubre el rango completo del bloque
    // original -- así el día queda realmente abierto a reservas nuevas,
    // no solo alrededor de los turnos reubicados.
    habilitarTurnosNuevos?: boolean;
  }
): Promise<void> {
  if (resolucion === "cancelar") {
    for (const turno of conflictos) {
      await tx.turno.update({
        where: { id: turno.id },
        data: { estado: "CANCELADO", avisoPendiente: true, avisoPendienteMotivo: "CANCELADO" },
      });
    }
    return;
  }

  const porLugar = new Map<string, ConflictoTurno[]>();
  for (const turno of conflictos) {
    const lista = porLugar.get(turno.lugarId) ?? [];
    lista.push(turno);
    porLugar.set(turno.lugarId, lista);
  }

  if (resolucion === "mover_dia_libre") {
    const horariosConsecutivos = contexto.horariosConsecutivos ?? false;
    const habilitarTurnosNuevos = contexto.habilitarTurnosNuevos ?? true;

    for (const [lugarId, turnosDelLugar] of porLugar) {
      const diaLibre = contexto.diasLibrePorLugar?.get(lugarId);
      if (!diaLibre) {
        throw new SinDiaLibreError(
          "No hay ningún día sin horario configurado para reprogramar estos turnos."
        );
      }

      // Se agrupan los turnos por el bloque de horario REAL al que
      // pertenecían originalmente (mismo cálculo server-side que ya usa
      // `resolverRangosBloques` -- nunca se confía en nada del cliente
      // para esto) -- "Día completo" puede haber tocado más de un bloque
      // del mismo lugar, y cada uno tiene su propia hora de inicio.
      const blocksDelLugar = contexto.blocks.filter((b) => b.lugarId === lugarId);
      const fechaOriginal = startOfDayBA(turnosDelLugar[0].inicio);
      const slotsOriginales = generarSlots(fechaOriginal, blocksDelLugar, contexto.slotDurationMinutes);
      const slotsOriginalesIso = slotsOriginales.map((s) => ({
        inicio: s.inicio.toISOString(),
        fin: s.fin.toISOString(),
        lugarId: s.lugarId,
      }));
      const bloquesOriginales = bloquesDelDia(agruparPorLugar(slotsOriginalesIso, []));

      const gruposPorBloque = new Map<string, { inicio: Date; fin: Date; turnos: ConflictoTurno[] }>();
      for (const turno of turnosDelLugar) {
        const bloque = bloquesOriginales.find(
          (b) => new Date(b.inicio) <= turno.inicio && turno.inicio < new Date(b.fin)
        );
        // Un turno sin bloque real que lo contenga (caso raro, ej. un
        // sobreturno fuera de grilla) se trata como su propio bloque de 1,
        // acotado a su propio horario -- ni "consecutivos" ni "habilitar"
        // tienen un rango más amplio y confiable para ofrecer ahí.
        const key = bloque ? bloque.key : `turno-${turno.id}`;
        const grupo = gruposPorBloque.get(key) ?? {
          inicio: bloque ? new Date(bloque.inicio) : turno.inicio,
          fin: bloque ? new Date(bloque.fin) : turno.fin,
          turnos: [],
        };
        grupo.turnos.push(turno);
        gruposPorBloque.set(key, grupo);
      }

      for (const { inicio: bloqueInicio, fin: bloqueFin, turnos } of gruposPorBloque.values()) {
        const minutosInicioBloque = getMinutesSinceMidnightBA(bloqueInicio);
        const minutosFinBloque = getMinutesSinceMidnightBA(bloqueFin);

        if (horariosConsecutivos) {
          const ordenados = [...turnos].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
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
          for (const turno of turnos) {
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
            data: { userId: tenantId, lugarId, inicio: aperturaInicio, fin: aperturaFin },
          });
        }
      }
    }
    return;
  }

  // "mover_siguiente_libre": reusa `planReschedule` (ya sabe saltear
  // `bloqueosVigentes` y buscar hacia adelante hasta 120 días), acotado a
  // los bloques del lugar de CADA grupo para que nunca reubique un turno en
  // un horario de otro lugar.
  for (const [lugarId, turnosDelLugar] of porLugar) {
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
