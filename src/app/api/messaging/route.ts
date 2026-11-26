import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { messagingSchema } from "@/lib/turno-schema";

export async function GET() {
  const { user, response } = await requireDoctor();
  if (response) return response;

  return NextResponse.json({
    mensajeTemplate: user.mensajeTemplate,
    mensajeTemplateVirtual: user.mensajeTemplateVirtual,
    mensajeTemplatePasoTeleconsulta: user.mensajeTemplatePasoTeleconsulta,
    mensajeriaHabilitada: user.mensajeriaHabilitada,
    recordatorioAutoEnviado: user.recordatorioAutoEnviado,
    mensajeTemplateCancelado: user.mensajeTemplateCancelado,
    mensajeTemplateAplazado: user.mensajeTemplateAplazado,
  });
}

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = messagingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
  });

  return NextResponse.json({
    mensajeTemplate: updated.mensajeTemplate,
    mensajeTemplateVirtual: updated.mensajeTemplateVirtual,
    mensajeTemplatePasoTeleconsulta: updated.mensajeTemplatePasoTeleconsulta,
    mensajeriaHabilitada: updated.mensajeriaHabilitada,
    recordatorioAutoEnviado: updated.recordatorioAutoEnviado,
    mensajeTemplateCancelado: updated.mensajeTemplateCancelado,
    mensajeTemplateAplazado: updated.mensajeTemplateAplazado,
  });
}
