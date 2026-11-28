import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarTokenBajaEngagement } from "@/lib/engagement-baja";

// Baja (o re-alta) de los mails de activación del trial, sin sesión: el link
// va firmado (ver src/lib/engagement-baja.ts). Dos orígenes:
// - Baja de un clic del cliente de mail (header `List-Unsubscribe`, RFC 8058):
//   POST con `List-Unsubscribe=One-Click`, responde 200 sin redirigir.
// - El formulario de /mails/baja (`origen=pagina`): redirige de vuelta.
export async function POST(request: NextRequest) {
  const u = request.nextUrl.searchParams.get("u") ?? "";
  const t = request.nextUrl.searchParams.get("t") ?? "";
  if (!verificarTokenBajaEngagement(u, t)) {
    return NextResponse.json({ error: "Link inválido." }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  const desdePagina = form?.get("origen") === "pagina";
  const alta = desdePagina && form?.get("accion") === "alta";

  await prisma.user.updateMany({
    where: { id: u, role: "DOCTOR" },
    data: { recibeMailsEngagement: alta },
  });

  if (!desdePagina) return new NextResponse(null, { status: 200 });
  const destino = new URL("/mails/baja", request.nextUrl.origin);
  destino.search = new URLSearchParams({ u, t, estado: alta ? "alta" : "baja" }).toString();
  return NextResponse.redirect(destino, 303);
}
