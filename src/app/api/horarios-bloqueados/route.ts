import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { bloqueoHorarioInputSchema } from "@/lib/bloqueo-horario-schema";
import { crearBloqueoDia, crearBloqueosDeBloques, BloqueoSinBloquesError } from "@/lib/bloqueo-horario";
import { dateParamToDateBA, startOfDayBA } from "@/lib/timezone";
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

  try {
    if (parsed.data.modo === "dia") {
      const lugarId = user.role === "DOCTOR" ? null : (activeLugarId ?? null);
      await crearBloqueoDia(tenantId, lugarId, fecha, parsed.data.motivo);
    } else {
      const scopeLugarId = user.role === "DOCTOR" ? undefined : (activeLugarId ?? undefined);
      await crearBloqueosDeBloques(tenantId, scopeLugarId, fecha, parsed.data.bloqueKeys, parsed.data.motivo);
    }
  } catch (error) {
    if (error instanceof BloqueoSinBloquesError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
