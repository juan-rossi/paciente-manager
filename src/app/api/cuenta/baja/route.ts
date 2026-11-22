import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { cancelarPreapproval } from "@/lib/mercadopago";
import { BAJA_CONFIRMACION, eliminacionProgramadaPara } from "@/lib/baja-cuenta";
import { borrarArchivosImportacion } from "@/lib/datos-server";
import { avisarBajaCuenta } from "@/lib/email-datos";
import { getSiteUrl } from "@/lib/site-url";

const bajaSchema = z.object({
  confirmacion: z.string().trim().toUpperCase().pipe(z.literal(BAJA_CONFIRMACION)),
});

// Baja de la cuenta (Acuerdo de tratamiento de datos, punto 6): corta los
// cobros, saca el perfil del directorio y deja la cuenta en modo solo
// descarga hasta que el cron de limpieza la borre (ver src/lib/baja-cuenta.ts).
export async function POST(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const parsed = bajaSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Escribí ${BAJA_CONFIRMACION} para confirmar la baja.` },
      { status: 400 }
    );
  }
  if (user.bajaAt) {
    return NextResponse.json({ error: "Tu cuenta ya está dada de baja." }, { status: 409 });
  }

  // Misma condición que /api/mercadopago/cancelar: cualquier suscripción no
  // cancelada. Si MercadoPago falla no se da la baja -- seguiría cobrando.
  const suscripcionActiva =
    !!user.mpPreapprovalId && !!user.mpPreapprovalStatus && user.mpPreapprovalStatus !== "CANCELLED";
  if (suscripcionActiva) {
    try {
      await cancelarPreapproval(user.mpPreapprovalId!);
    } catch (error) {
      console.error("[cuenta/baja] no se pudo cancelar la suscripción", error);
      return NextResponse.json(
        { error: "No pudimos cancelar tu suscripción con MercadoPago. Probá de nuevo en unos minutos." },
        { status: 502 }
      );
    }
  }

  const ahora = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        bajaAt: ahora,
        perfilPublico: false,
        reservaPublicaHabilitada: false,
        ...(suscripcionActiva ? { mpPreapprovalStatus: "CANCELLED", canceladaEl: ahora } : {}),
      },
    });
    const abiertas = await tx.importacionHC.findMany({
      where: { doctorId: user.id, estado: { in: ["BORRADOR", "ENVIADA"] } },
      select: { id: true },
    });
    for (const { id } of abiertas) {
      await borrarArchivosImportacion(tx, id, { estado: "CANCELADA" });
    }
  });

  const baseUrl = process.env.NODE_ENV === "production" ? getSiteUrl() : request.nextUrl.origin;
  after(() =>
    avisarBajaCuenta(user.email, {
      nombre: user.nombre,
      eliminacionEl: eliminacionProgramadaPara(ahora),
      baseUrl,
    })
  );

  return NextResponse.json({ ok: true });
}

// Cancela la baja mientras no se hayan borrado los datos. El perfil público y
// la suscripción no se restauran solos: el médico los vuelve a activar.
export async function DELETE() {
  const { user, response } = await requireDoctor();
  if (response) return response;

  if (!user.bajaAt || user.eliminadaAt) {
    return NextResponse.json({ error: "Tu cuenta no está dada de baja." }, { status: 409 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { bajaAt: null } });
  return NextResponse.json({ ok: true });
}
