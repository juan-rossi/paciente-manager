import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor, requireUser } from "@/lib/api-auth";
import { dailyConfigurado } from "@/lib/daily";
import { estadoSala, SALA_ABRE_MINUTOS_ANTES, urlIngresoSala } from "@/lib/teleconsulta";
import { asegurarLinkCodigos, linkPaciente } from "@/lib/turno-link-paciente";
import { formatNombreConTitulo, type TituloCortesia } from "@/lib/titulo-cortesia";
import { teleconsultaHabilitada } from "@/lib/feature-flags";
import { medicoPuedeUsarSalas } from "@/lib/teleconsulta-medico";

type RouteParams = { params: Promise<{ id: string }> };

// GET: el link de la sala para mandarle al paciente (médico o asistente --
// es solo un link, no da acceso a la HC). Mismo criterio de ownership que el
// resto de las rutas de turnos: un asistente solo ve turnos de su lugar
// activo.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  if (!teleconsultaHabilitada()) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }
  const { user, tenantId, activeLugarId, response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  if (user.role === "SECRETARY" && activeLugarId === null) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }
  const turno = await prisma.turno.findFirst({
    where: {
      id,
      doctorId: tenantId,
      ...(user.role === "SECRETARY" ? { lugarId: activeLugarId! } : {}),
    },
    select: { id: true, linkCodigo: true, estado: true, teleconsulta: true },
  });
  if (!turno || !turno.teleconsulta) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }

  const codigos = await asegurarLinkCodigos([turno]);
  const codigo = codigos.get(turno.id)!;
  // `confirmar`/`cancelar`: para el aviso de "pasó a teleconsulta".
  return NextResponse.json({
    link: linkPaciente(codigo, "sala"),
    confirmar: linkPaciente(codigo, "si"),
    cancelar: linkPaciente(codigo, "no"),
  });
}

// POST: el médico entra a la sala (como dueño). El asistente nunca entra a
// la consulta.
export async function POST(_request: NextRequest, { params }: RouteParams) {
  if (!teleconsultaHabilitada()) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }
  const { tenantId, response } = await requireDoctor({ escritura: true });
  if (response) return response;
  const { id } = await params;

  const turno = await prisma.turno.findFirst({
    where: { id, doctorId: tenantId },
    select: {
      id: true,
      inicio: true,
      fin: true,
      estado: true,
      salaVideoNombre: true,
      teleconsulta: true,
      doctor: { select: { nombre: true, tituloCortesia: true } },
    },
  });
  if (!turno || !turno.teleconsulta) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }
  if (!(await medicoPuedeUsarSalas(tenantId))) {
    return NextResponse.json(
      { error: "La teleconsulta es parte del plan Premium." },
      { status: 403 }
    );
  }
  if (turno.estado === "CANCELADO") {
    return NextResponse.json({ error: "Este turno está cancelado." }, { status: 409 });
  }
  const estado = estadoSala(turno);
  if (estado !== "abierta") {
    return NextResponse.json(
      {
        error:
          estado === "antes"
            ? `La sala se abre ${SALA_ABRE_MINUTOS_ANTES} minutos antes del turno.`
            : "La sala de este turno ya cerró.",
      },
      { status: 409 }
    );
  }
  if (!dailyConfigurado()) {
    return NextResponse.json(
      { error: "La videollamada no está configurada (falta DAILY_API_KEY)." },
      { status: 503 }
    );
  }

  try {
    const url = await urlIngresoSala(turno, {
      nombreVisible: formatNombreConTitulo(
        turno.doctor.tituloCortesia as TituloCortesia | null,
        turno.doctor.nombre
      ),
      esMedico: true,
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[teleconsulta] médico", error);
    return NextResponse.json({ error: "No se pudo abrir la sala. Probá de nuevo." }, { status: 502 });
  }
}
