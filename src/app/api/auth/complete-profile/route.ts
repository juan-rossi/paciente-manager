import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { completeProfileSchema } from "@/lib/register-schema";

// Paso post-Google: completa apellido/matrícula, que Google no provee.
export async function POST(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = completeProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { apellido: parsed.data.apellido, nroMatricula: parsed.data.nroMatricula },
  });

  return NextResponse.json({ ok: true });
}
