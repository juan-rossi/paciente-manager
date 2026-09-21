import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getRecordatoriosDelDia } from "@/lib/get-recordatorios-del-dia";
import { dateParamToDateBA } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const { tenantId, activeLugarId, response } = await requireUser();
  if (response) return response;

  const date = dateParamToDateBA(request.nextUrl.searchParams.get("date") ?? "");
  if (!date) {
    return NextResponse.json({ error: "Parámetro 'date' inválido (YYYY-MM-DD)." }, { status: 400 });
  }

  const result = await getRecordatoriosDelDia(date, tenantId, activeLugarId);

  return NextResponse.json(result);
}
