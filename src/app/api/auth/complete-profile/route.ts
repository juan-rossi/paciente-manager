import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { completeProfileSchema } from "@/lib/register-schema";
import { enviarMailBienvenida } from "@/lib/bienvenida-email";
import { getSiteUrl } from "@/lib/site-url";

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

  const data = {
    apellido: parsed.data.apellido,
    nroMatricula: parsed.data.nroMatricula,
    tituloCortesia: parsed.data.tituloCortesia,
    especialidad: parsed.data.especialidad,
  };
  // La cuenta de Google se crea sin matrícula (ver src/auth.ts): si este
  // update es el que la completa, es el alta real y va el mail de
  // bienvenida. Condicionarlo a `nroMatricula: ""` evita mandarlo dos veces
  // si el form se envía de nuevo.
  const primeraVez = await prisma.user.updateMany({
    where: { id: user.id, nroMatricula: "" },
    data,
  });
  if (primeraVez.count > 0) {
    const completo = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { email: true, nombre: true, apellido: true, tituloCortesia: true, plan: true },
    });
    const baseUrl = process.env.NODE_ENV === "production" ? getSiteUrl() : request.nextUrl.origin;
    after(() => enviarMailBienvenida(completo, baseUrl));
  } else {
    await prisma.user.update({ where: { id: user.id }, data });
  }

  return NextResponse.json({ ok: true });
}
