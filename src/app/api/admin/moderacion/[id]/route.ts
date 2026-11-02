import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// `updatedAt` es el de la revisión que el admin tenía en pantalla: si el
// médico cambió el contenido mientras tanto (misma fila, ver
// `ModeracionPerfil`), no se aprueba algo que nadie miró.
const decisionInput = z.object({
  decision: z.enum(["APROBAR", "RECHAZAR"]),
  updatedAt: z.iso.datetime(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = decisionInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const revision = await prisma.moderacionPerfil.findUnique({
    where: { id },
    select: { estado: true, updatedAt: true, userId: true, campo: true, contenido: true },
  });
  if (!revision || revision.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Esta revisión ya no está pendiente." }, { status: 409 });
  }
  if (revision.updatedAt.toISOString() !== parsed.data.updatedAt) {
    return NextResponse.json(
      { error: "El médico cambió el contenido mientras lo revisabas. Recargá para ver la versión nueva." },
      { status: 409 }
    );
  }

  const aprobada = parsed.data.decision === "APROBAR";
  const resolucion = prisma.moderacionPerfil.update({
    where: { id },
    data: { estado: aprobada ? "APROBADA" : "RECHAZADA", resueltaAt: new Date(), resueltaPorId: user.id },
  });

  // Rechazar no toca el perfil: el público sigue viendo la versión anterior.
  if (aprobada) {
    await prisma.$transaction([
      resolucion,
      prisma.user.update({
        where: { id: revision.userId },
        data:
          revision.campo === "FOTO"
            ? { fotoPublicaBase64: revision.contenido }
            : { biografiaPublica: revision.contenido },
      }),
    ]);
  } else {
    await resolucion;
  }

  return NextResponse.json({ ok: true });
}
