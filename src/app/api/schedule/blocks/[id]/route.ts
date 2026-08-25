import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  await prisma.workScheduleBlock.deleteMany({ where: { id, userId: user.id } });

  return NextResponse.json({ ok: true });
}
