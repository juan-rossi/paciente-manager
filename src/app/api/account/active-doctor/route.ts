import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

const schema = z.object({ doctorId: z.string().min(1) });

// Una secretaria puede asistir a más de un médico -- este endpoint cambia a
// cuál cuenta está operando ahora mismo (ver `doctor-switcher.tsx`). Se
// valida que la asignación exista antes de aceptarla, para que no pueda
// "entrar" a la cuenta de un médico al que no asiste.
export async function PATCH(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  if (user.role !== "SECRETARY") {
    return NextResponse.json(
      { error: "Solo las cuentas de secretaria eligen médico activo." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const asignacion = await prisma.doctorSecretaria.findUnique({
    where: {
      doctorId_secretariaId: { doctorId: parsed.data.doctorId, secretariaId: user.id },
    },
  });
  if (!asignacion) {
    return NextResponse.json({ error: "No asistís a ese médico." }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { activeDoctorId: parsed.data.doctorId },
  });

  return NextResponse.json({ ok: true });
}
