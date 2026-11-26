import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/request-ip";
import { rateLimitOk } from "@/lib/rate-limit";
import { buscarTurnoPorLinkCodigo } from "@/lib/turno-link-paciente";
import { dailyConfigurado } from "@/lib/daily";
import { estadoSala, urlIngresoSala } from "@/lib/teleconsulta";
import { teleconsultaHabilitada } from "@/lib/feature-flags";

type RouteParams = { params: Promise<{ codigo: string }> };

// El paciente entra a la teleconsulta desde el link de su turno. El código
// del link es el único "login": solo sirve para ESTE turno, solo si es
// virtual, no está cancelado y estamos dentro de la ventana de la sala.
export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!teleconsultaHabilitada()) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  const { codigo } = await params;

  if (!(await rateLimitOk(getClientIp(request), codigo, "link-turno"))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429 }
    );
  }

  const turno = await buscarTurnoPorLinkCodigo(codigo);
  if (!turno || turno.lugar.tipo !== "VIRTUAL") {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  if (turno.estado === "CANCELADO") {
    return NextResponse.json({ error: "Este turno está cancelado." }, { status: 409 });
  }
  const estado = estadoSala(turno);
  if (estado !== "abierta") {
    return NextResponse.json(
      { error: estado === "antes" ? "La sala todavía no está abierta." : "La consulta ya terminó." },
      { status: 409 }
    );
  }
  if (!dailyConfigurado()) {
    return NextResponse.json({ error: "La videollamada no está disponible en este momento." }, { status: 503 });
  }

  try {
    const url = await urlIngresoSala(turno, { nombreVisible: turno.nombreYApellido, esMedico: false });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[teleconsulta] paciente", error);
    return NextResponse.json({ error: "No se pudo abrir la sala. Probá de nuevo." }, { status: 502 });
  }
}
