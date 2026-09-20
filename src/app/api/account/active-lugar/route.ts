import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

const schema = z.object({ lugarId: z.string().min(1) });

// Dentro del médico activo, una secretaria puede tener más de un lugar
// asignado -- este endpoint cambia a cuál está administrando turnos ahora
// mismo (ver `lugar-switcher.tsx`). Se valida que el lugar realmente esté
// entre los asignados a la secretaria para ESE médico antes de aceptarlo.
export async function PATCH(request: NextRequest) {
  const { user, tenantId, response } = await requireUser();
  if (response) return response;

  if (user.role !== "SECRETARY") {
    return NextResponse.json(
      { error: "Solo las cuentas de secretaria eligen lugar activo." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const asignacion = await prisma.doctorSecretaria.findUnique({
    where: { doctorId_secretariaId: { doctorId: tenantId, secretariaId: user.id } },
    select: { lugares: { select: { lugarId: true } } },
  });
  const permitido = asignacion?.lugares.some((l) => l.lugarId === parsed.data.lugarId) ?? false;
  if (!permitido) {
    return NextResponse.json({ error: "Ese lugar no está asignado a tu cuenta." }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { activeLugarId: parsed.data.lugarId },
  });

  return NextResponse.json({ ok: true });
}
