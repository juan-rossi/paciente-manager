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
  agruparConflictosPorBloque,
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
        await crearBloqueosDeBloques(tenantId, rangos, parsed.data.motivo);
      }
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // Hace falta agrupar los conflictos en bloques reales tanto para la
    // respuesta 409 (un paso del wizard por bloque) como para resolverlos
    // después -- se busca `blocks`/`doctor` ACÁ, antes de saber si ya hay
    // una resolución, en vez de solo en la rama "ya resuelto" como antes.
    const [blocks, doctor] = await Promise.all([
      prisma.workScheduleBlock.findMany({ where: { userId: tenantId } }),
      prisma.user.findUniqueOrThrow({ where: { id: tenantId }, select: { slotDurationMinutes: true } }),
    ]);
    const bloquesConflicto = agruparConflictosPorBloque(
      fecha,
      conflictos,
      blocks,
      doctor.slotDurationMinutes
    );

    if (!parsed.data.resolucionesPorBloque) {
      // Todavía no eligió cómo resolverlos -- el cliente muestra el wizard
      // del paso 2 (un bloque a la vez) y vuelve a pedir, ahora con
      // `resolucionesPorBloque`. Ya manda los candidatos de "Mover a un día
      // libre" acá para que ese paso pueda mostrar el selector sin una
      // vuelta más al servidor.
      const diasLibreDisponibles = await prepararCandidatosDiasLibres(tenantId, conflictos);
      return NextResponse.json(
        {
          conflict: true,
          bloques: bloquesConflicto.map((b) => ({
            key: b.key,
            lugarId: b.lugarId,
            inicio: b.inicio.toISOString(),
            fin: b.fin.toISOString(),
            turnos: b.turnos.map((t) => ({
              id: t.id,
              nombreYApellido: t.nombreYApellido,
              inicio: t.inicio.toISOString(),
            })),
          })),
          diasLibreDisponibles: diasLibreDisponibles.map((d) => ({
            lugarId: d.lugarId,
            fechas: d.fechas.map((f) => formatDateParamBA(f)),
          })),
        },
        { status: 409 }
      );
    }

    // Nunca se confía en los `bloqueKey` que mande el cliente: tienen que
    // ser EXACTAMENTE los que se acaban de recalcular server-side. Si algo
    // cambió mientras el usuario tenía el diálogo abierto (ej. otro turno
    // se canceló o se agregó uno nuevo desde otra pestaña), se rechaza en
    // vez de aplicar resoluciones a bloques que ya no reflejan la realidad.
    const keysServer = new Set(bloquesConflicto.map((b) => b.key));
    const keysCliente = new Set(parsed.data.resolucionesPorBloque.map((r) => r.bloqueKey));
    const mismosBloques =
      keysServer.size === keysCliente.size && [...keysServer].every((k) => keysCliente.has(k));
    if (!mismosBloques) {
      return NextResponse.json(
        { error: "Los bloques en conflicto cambiaron -- volvé a intentar." },
        { status: 409 }
      );
    }

    const todayStart = startOfDayBA(new Date());
    const bloquesConDiaLibre = bloquesConflicto.filter(
      (b) =>
        parsed.data.resolucionesPorBloque!.find((r) => r.bloqueKey === b.key)?.resolucion ===
        "mover_dia_libre"
    );
    const [bloqueosExistentes, diasLibrePorBloque] = await Promise.all([
      prisma.bloqueoHorario.findMany({ where: { userId: tenantId, fin: { gt: todayStart } } }),
      // Solo hace falta para "mover_dia_libre", pero se resuelve siempre
      // acá afuera -- nunca adentro de la transacción (ver el comentario en
      // `validarDiasLibreElegidos`). Valida la elección del usuario contra
      // los candidatos reales -- nunca se confía en la fecha tal cual.
      bloquesConDiaLibre.length > 0
        ? validarDiasLibreElegidos(
            tenantId,
            bloquesConDiaLibre.map((b) => ({ key: b.key, lugarId: b.lugarId })),
            parsed.data.resolucionesPorBloque
              .filter((r) => r.resolucion === "mover_dia_libre")
              .map((r) => ({ bloqueKey: r.bloqueKey, fecha: r.fecha! }))
          )
        : Promise.resolve(undefined),
    ]);

    await prisma.$transaction(
      async (tx) => {
        await resolverConflictos(tx, tenantId, bloquesConflicto, parsed.data.resolucionesPorBloque!, {
          blocks,
          slotDurationMinutes: doctor.slotDurationMinutes,
          // Incluye el rango que se está por crear -- si no, "próximo horario
          // libre" podría reubicar un turno justo adentro del bloqueo nuevo.
          bloqueosVigentes: [...bloqueosExistentes, ...rangos],
          diasLibrePorBloque,
        });
        if (parsed.data.modo === "dia") {
          await crearBloqueoDia(tenantId, lugarId, fecha, parsed.data.motivo, tx);
        } else {
          await crearBloqueosDeBloques(tenantId, rangos, parsed.data.motivo, tx);
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
