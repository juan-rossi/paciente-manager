import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { bloqueoHorarioInputSchema } from "@/lib/bloqueo-horario-schema";
import {
  crearBloqueoDia,
  crearBloqueosDeBloques,
  resolverRangoDia,
  resolverRangosBloques,
  BloqueoSinBloquesError,
} from "@/lib/bloqueo-horario";
import {
  detectarConflictos,
  prepararCandidatosDiasLibres,
  resolverConflictos,
  validarDiasLibreElegidos,
  DiaLibreInvalidoError,
  SinDiaLibreError,
  SinHorarioDisponibleError,
} from "@/lib/bloqueo-conflictos";
import { dateParamToDateBA, formatDateParamBA, startOfDayBA } from "@/lib/timezone";
import { resolvePuedeBloquearHorarios } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  const { user, tenantId, activeLugarId, response } = await requireUser();
  if (response) return response;

  if (!(await resolvePuedeBloquearHorarios(user))) {
    return NextResponse.json(
      { error: "No tenés permiso para bloquear horarios." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bloqueoHorarioInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const fecha = dateParamToDateBA(parsed.data.fecha);
  if (!fecha) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  if (fecha.getTime() < startOfDayBA(new Date()).getTime()) {
    return NextResponse.json({ error: "No podés bloquear un día que ya pasó." }, { status: 400 });
  }

  // Una secretaria nunca puede bloquear un lugar que no administra -- ver
  // el mismo criterio ya aplicado en POST /api/turnos. Un médico ve/bloquea
  // todos sus lugares.
  if (user.role === "SECRETARY" && activeLugarId === null) {
    return NextResponse.json({ error: "No tenés un lugar asignado." }, { status: 403 });
  }

  const lugarId = user.role === "DOCTOR" ? null : (activeLugarId ?? null);
  const scopeLugarId = user.role === "DOCTOR" ? undefined : (activeLugarId ?? undefined);

  try {
    // Fase 1: solo calcula los rangos que se van a bloquear, no escribe
    // nada -- hace falta para poder detectar conflictos ANTES de crear la
    // fila (ver bloqueo-conflictos.ts).
    const rangos =
      parsed.data.modo === "dia"
        ? resolverRangoDia(lugarId, fecha)
        : await resolverRangosBloques(tenantId, scopeLugarId, fecha, parsed.data.bloqueKeys);

    const conflictos = await detectarConflictos(tenantId, rangos);

    if (conflictos.length === 0) {
      // Sin conflictos: comportamiento de siempre, sin transacción extra.
      if (parsed.data.modo === "dia") {
        await crearBloqueoDia(tenantId, lugarId, fecha, parsed.data.motivo);
      } else {
        await crearBloqueosDeBloques(tenantId, scopeLugarId, fecha, parsed.data.bloqueKeys, parsed.data.motivo);
      }
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    if (!parsed.data.resolucionConflicto) {
      // Todavía no eligió cómo resolverlos -- el cliente muestra el paso 2
      // del diálogo con esta lista y vuelve a pedir, ahora con
      // `resolucionConflicto`. Ya manda los candidatos de "Mover a un día
      // libre" acá para que ese paso pueda mostrar el selector sin una
      // vuelta más al servidor.
      const diasLibreDisponibles = await prepararCandidatosDiasLibres(tenantId, conflictos);
      return NextResponse.json(
        {
          conflict: true,
          turnos: conflictos.map((t) => ({
            id: t.id,
            nombreYApellido: t.nombreYApellido,
            inicio: t.inicio.toISOString(),
            lugarId: t.lugarId,
          })),
          diasLibreDisponibles: diasLibreDisponibles.map((d) => ({
            lugarId: d.lugarId,
            fechas: d.fechas.map((f) => formatDateParamBA(f)),
          })),
        },
        { status: 409 }
      );
    }

    // Ya eligió una resolución: se resuelven los conflictos y se crea el
    // bloqueo en la misma transacción -- si algo falla (ej. no hay horario
    // disponible), no queda nada a medio aplicar.
    const todayStart = startOfDayBA(new Date());
    const [blocks, doctor, bloqueosExistentes, diasLibrePorLugar] = await Promise.all([
      prisma.workScheduleBlock.findMany({ where: { userId: tenantId } }),
      prisma.user.findUniqueOrThrow({ where: { id: tenantId }, select: { slotDurationMinutes: true } }),
      prisma.bloqueoHorario.findMany({ where: { userId: tenantId, fin: { gt: todayStart } } }),
      // Solo hace falta para "mover_dia_libre", pero se resuelve siempre acá
      // afuera -- nunca adentro de la transacción (ver el comentario en
      // `validarDiasLibreElegidos`). Valida la elección del usuario contra
      // los candidatos reales -- nunca se confía en la fecha tal cual.
      parsed.data.resolucionConflicto === "mover_dia_libre"
        ? validarDiasLibreElegidos(tenantId, conflictos, parsed.data.diasLibreElegidos ?? [])
        : Promise.resolve(undefined),
    ]);

    await prisma.$transaction(
      async (tx) => {
        await resolverConflictos(tx, tenantId, conflictos, parsed.data.resolucionConflicto!, {
          blocks,
          slotDurationMinutes: doctor.slotDurationMinutes,
          // Incluye el rango que se está por crear -- si no, "próximo horario
          // libre" podría reubicar un turno justo adentro del bloqueo nuevo.
          bloqueosVigentes: [...bloqueosExistentes, ...rangos],
          diasLibrePorLugar,
          horariosConsecutivos: parsed.data.horariosConsecutivos,
          habilitarTurnosNuevos: parsed.data.habilitarTurnosNuevos,
        });
        if (parsed.data.modo === "dia") {
          await crearBloqueoDia(tenantId, lugarId, fecha, parsed.data.motivo, tx);
        } else {
          await crearBloqueosDeBloques(tenantId, scopeLugarId, fecha, parsed.data.bloqueKeys, parsed.data.motivo, tx);
        }
      },
      // Puede haber varios turnos, cada uno con su propio `tx.turno.update` --
      // el default de 5s de Prisma alcanza de sobra en producción, pero se
      // amplía para no quedar corto en tandas grandes.
      { timeout: 20_000 }
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof BloqueoSinBloquesError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SinDiaLibreError || error instanceof SinHorarioDisponibleError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof DiaLibreInvalidoError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
