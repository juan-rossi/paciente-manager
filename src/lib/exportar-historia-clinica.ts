import { NextResponse } from "next/server";
import type { Prisma, Turno } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimitOk } from "@/lib/rate-limit";

// Ley 26.529 art. 18: el depositario legal de la historia clínica es el
// profesional (no la plataforma) -- si un médico deja Semio360, necesita
// poder llevarse una copia completa de todo lo que atendió para seguir
// cumpliendo su propia obligación de guarda de 10 años, fuera de la app.
// Incluye TODO (incluidos los registros dados de baja vía soft-delete):
// ocultarlos de la UI del día a día no significa que dejen de ser parte de
// la historia clínica que el médico debe conservar. Eso incluye la parte
// odontológica (odontogramas con sus prácticas y presupuestos con sus ítems).
//
// Lo usan "Mis datos" (el propio médico) y la ficha de /admin/medicos para un
// médico suspendido que pide su copia por mail. `actorId` es quien la
// descarga, para la auditoría.
//
// Se genera en STREAMING y por lotes: una cuenta con miles de pacientes son
// decenas de MB (y crece con los años); armarlo entero en memoria podía
// agotar la memoria o el tiempo de la función justo cuando el médico lo
// necesita. El archivo es el mismo JSON de siempre, con la misma forma e
// indentación: `{ generadoEl, medico, pacientes: [...], turnos: [...] }`.
// Al leer por lotes no es una foto de un único instante: un paciente editado
// mientras se genera puede salir con o sin ese cambio.

const LOTE = 200;

const includePaciente = {
  // Desempate por id en todo: el orden del archivo no depende de la base.
  antecedentes: { orderBy: { id: "asc" } },
  evoluciones: { orderBy: [{ fecha: "asc" }, { id: "asc" }] },
  consentimientos: { orderBy: [{ fecha: "asc" }, { id: "asc" }] },
  odontogramas: {
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    include: { practicas: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  },
  presupuestos: {
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    include: { items: { orderBy: { orden: "asc" } } },
  },
} satisfies Prisma.PatientInclude;

// Indenta un JSON ya serializado como si estuviera `nivel` espacios adentro
// del documento completo (igual que `JSON.stringify(todo, null, 2)`).
function indentar(json: string, nivel: number, primeraLinea = true): string {
  const espacios = " ".repeat(nivel);
  return (primeraLinea ? espacios : "") + json.replace(/\n/g, `\n${espacios}`);
}

async function* generar(doctorId: string, actorId: string) {
  const doctor = await prisma.user.findUnique({
    where: { id: doctorId },
    select: { nombre: true, apellido: true, email: true, nroMatricula: true },
  });

  yield `{\n  "generadoEl": ${JSON.stringify(new Date().toISOString())},\n`;
  yield `  "medico": ${indentar(JSON.stringify(doctor, null, 2), 2, false)},\n`;

  yield `  "pacientes": [`;
  let hayPacientes = false;
  let cursor: string | undefined;
  for (;;) {
    const lote = await prisma.patient.findMany({
      where: { doctorId },
      include: includePaciente,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: LOTE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (lote.length === 0) break;

    // Ley 26.529 art. 13: constancia de qué HC salieron y quién las bajó --
    // por lote, a medida que se envían.
    await prisma.auditLog.createMany({
      data: lote.map((p) => ({
        doctorId,
        actorId,
        accion: "EXPORTAR" as const,
        entidad: "PACIENTE" as const,
        entidadId: p.id,
      })),
    });

    for (const paciente of lote) {
      yield (hayPacientes ? ",\n" : "\n") + indentar(JSON.stringify(paciente, null, 2), 4);
      hayPacientes = true;
    }
    cursor = lote[lote.length - 1].id;
    if (lote.length < LOTE) break;
  }
  yield hayPacientes ? "\n  ],\n" : "],\n";

  yield `  "turnos": [`;
  let hayTurnos = false;
  cursor = undefined;
  for (;;) {
    const lote: Turno[] = await prisma.turno.findMany({
      where: { doctorId },
      orderBy: [{ inicio: "asc" }, { id: "asc" }],
      take: LOTE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (lote.length === 0) break;
    for (const turno of lote) {
      yield (hayTurnos ? ",\n" : "\n") + indentar(JSON.stringify(turno, null, 2), 4);
      hayTurnos = true;
    }
    cursor = lote[lote.length - 1].id;
    if (lote.length < LOTE) break;
  }
  yield hayTurnos ? "\n  ]\n}" : "]\n}";
}

export async function exportarHistoriaClinica(doctorId: string, actorId: string): Promise<NextResponse> {
  // Cada export recorre la base entera del médico y deja una fila de
  // auditoría por paciente: con un tope por quien la baja y por cuenta, un
  // botón apretado varias veces (o una sesión robada con un script) no
  // carga la base ni infla la auditoría. Para "exportar", el primer campo
  // del rate limit es el id de quien descarga (no una IP).
  if (!(await rateLimitOk(`actor:${actorId}`, doctorId, "exportar"))) {
    return NextResponse.json(
      { error: "Ya generaste varias copias en la última hora. Esperá un rato y volvé a intentar." },
      { status: 429 }
    );
  }

  const encoder = new TextEncoder();
  const iterador = generar(doctorId, actorId);
  // El cliente puede cortar la descarga mientras se está leyendo un lote:
  // al volver de esa lectura el stream ya está cerrado y no hay que seguir.
  let cancelado = false;
  const stream = new ReadableStream<Uint8Array>({
    // `pull`: el siguiente lote se lee recién cuando el cliente consumió el
    // anterior, así la memoria queda acotada a un lote.
    async pull(controller) {
      try {
        const { value, done } = await iterador.next();
        if (cancelado) return;
        if (done) controller.close();
        else controller.enqueue(encoder.encode(value));
      } catch (error) {
        if (cancelado) return;
        console.error("[exportar-historia-clinica] falló a mitad de la descarga", { doctorId, error });
        controller.error(error);
      }
    },
    async cancel() {
      cancelado = true;
      await iterador.return(undefined);
    },
  });

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="semio360-historia-clinica-completa-${fecha}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
