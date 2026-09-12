import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/api-auth";
import { getTurnosDelDia } from "@/lib/turnos-del-dia";
import { dateParamToDateBA } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const { response } = await requireDoctor();
  if (response) return response;

  const date = dateParamToDateBA(request.nextUrl.searchParams.get("date") ?? "");
  if (!date) {
    return NextResponse.json({ error: "Parámetro 'date' inválido (YYYY-MM-DD)." }, { status: 400 });
  }

  const result = await getTurnosDelDia(date);
  return NextResponse.json(result);
}
