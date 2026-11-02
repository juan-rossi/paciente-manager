import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { sancionActual, sancionQueCorresponde } from "@/lib/sanciones";
import { enviarMailSancion } from "@/lib/sancion-email";

type RouteParams = { params: Promise<{ id: string }> };

const sancionInput = z.object({
  motivo: z.string().trim().min(1, "Escribí el motivo.").max(500),
  // La revisión de /admin/moderacion desde la que se sanciona, si el admin
  // eligió rechazarla también.
  revisionRechazadaId: z.string().optional(),
});

// El tipo de sanción no lo elige el cliente: sale del plan del médico en este
// momento (ver `sancionQueCorresponde`).
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user: admin, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = sancionInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const doctor = await prisma.user.findFirst({
    where: { id, role: "DOCTOR" },
    select: {
      email: true,
      nombre: true,
      apellido: true,
      tituloCortesia: true,
      plan: true,
      planDuracion: true,
      planEndsAt: true,
      trialEndsAt: true,
      suspendidoAt: true,
      fueraDelDirectorioAt: true,
    },
  });
  if (!doctor) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 404 });
  }
  if (sancionActual(doctor)) {
    return NextResponse.json({ error: "Este médico ya tiene una sanción vigente." }, { status: 409 });
  }

  const tipo = sancionQueCorresponde(doctor);
  const { motivo, revisionRechazadaId } = parsed.data;
  const ahora = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data:
        tipo === "SUSPENSION"
          ? {
              suspendidoAt: ahora,
              suspensionMotivo: motivo,
              suspendidoPorId: admin.id,
              // Invalida todos sus JWT: queda afuera al instante, en todos sus
              // dispositivos (ver el callback `jwt` en src/auth.ts).
              sessionVersion: { increment: 1 },
            }
          : {
              fueraDelDirectorioAt: ahora,
              fueraDelDirectorioMotivo: motivo,
              fueraDelDirectorioPorId: admin.id,
            },
    }),
    prisma.moderacionPerfil.updateMany({
      where: { id: revisionRechazadaId ?? "", userId: id, estado: "PENDIENTE" },
      data: { estado: "RECHAZADA", resueltaAt: ahora, resueltaPorId: admin.id },
    }),
  ]);

  after(() => enviarMailSancion(tipo, { ...doctor, motivo }));

  return NextResponse.json({ tipo });
}

// Levanta la sanción vigente (cualquiera de las dos). Los switches de perfil y
// agenda pública vuelven a valer lo que el médico tenía antes.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  const existing = await prisma.user.findFirst({ where: { id, role: "DOCTOR" }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: {
      suspendidoAt: null,
      suspensionMotivo: null,
      suspendidoPorId: null,
      fueraDelDirectorioAt: null,
      fueraDelDirectorioMotivo: null,
      fueraDelDirectorioPorId: null,
    },
  });
  return NextResponse.json({ ok: true });
}
