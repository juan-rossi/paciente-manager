import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getTenantId, resolveActiveLugarId } from "@/lib/tenant";
import { isPlatformAdmin } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { esActivo } from "@/lib/plan";

// `src/proxy.ts` solo protege PÁGINAS: toda ruta de /api tiene que validar
// por sí misma, a través de estos helpers, el estado de la cuenta (tenant)
// sobre la que opera.
type Opciones = {
  // Ruta que CARGA o MODIFICA datos del consultorio (pacientes, HC, turnos,
  // recordatorios, bloqueos): exige plan vigente. Leer y exportar no lo
  // exigen a propósito -- la HC se tiene que poder consultar aunque el plan
  // haya vencido (Ley 26.529) -- y la configuración, el perfil y los pagos
  // tampoco (hacen falta justamente para renovar).
  escritura?: boolean;
  // Solo para las rutas que sirven para salir de un tenant inválido
  // (elegir otro médico/lugar, aceptar una invitación) o completar el
  // perfil: no validan la cuenta del médico activo.
  validarCuenta?: boolean;
};

function rechazo(status: number, error: string, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

type UsuarioActual = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * Valida la cuenta (tenant) sobre la que opera el usuario y devuelve una
 * respuesta de rechazo, o `null` si puede seguir:
 * - SECRETARY: su `activeDoctorId` tiene que ser un médico que lo tenga
 *   asignado y aceptado HOY (el médico puede haberlo quitado después de que
 *   lo eligiera; ver `src/lib/tenant.ts`).
 * - Médico suspendido (ver `src/lib/sanciones.ts`): nadie opera su cuenta.
 *   Al médico ya se le invalidan las sesiones; esto corta a su asistente.
 * - `escritura`: además, plan vigente (`esActivo`).
 */
async function validarCuenta(user: UsuarioActual, escritura: boolean) {
  let cuenta: { trialEndsAt: Date | null; planEndsAt: Date | null; suspendidoAt: Date | null };

  if (user.role === "SECRETARY") {
    const asignacion = user.activeDoctorId
      ? await prisma.doctorSecretaria.findUnique({
          where: { doctorId_secretariaId: { doctorId: user.activeDoctorId, secretariaId: user.id } },
          select: {
            aceptadaAt: true,
            doctor: { select: { trialEndsAt: true, planEndsAt: true, suspendidoAt: true } },
          },
        })
      : null;
    if (!asignacion?.aceptadaAt) {
      return rechazo(403, "No tenés acceso a la agenda de este médico. Elegí otro médico.", "sin_medico");
    }
    cuenta = asignacion.doctor;
  } else {
    cuenta = user;
  }

  if (cuenta.suspendidoAt) {
    return rechazo(403, "La cuenta de este médico está suspendida.", "cuenta_suspendida");
  }
  if (escritura && !esActivo(cuenta)) {
    return rechazo(
      403,
      user.role === "SECRETARY"
        ? "La cuenta del médico no está activa: no se pueden cargar ni modificar datos hasta que renueve su plan."
        : "Tu plan no está activo: renovalo para seguir cargando y modificando datos. Podés seguir consultando y exportando tu información.",
      "cuenta_inactiva"
    );
  }
  return null;
}

export async function requireUser(opciones: Opciones = {}) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      tenantId: null,
      activeLugarId: null,
      response: rechazo(401, "No autorizado."),
    };
  }
  if (opciones.validarCuenta !== false && user.role !== "ADMIN") {
    const response = await validarCuenta(user, opciones.escritura ?? false);
    if (response) return { user: null, tenantId: null, activeLugarId: null, response };
  }
  const activeLugarId = await resolveActiveLugarId(user);
  return { user, tenantId: getTenantId(user), activeLugarId, response: null };
}

export async function requireDoctor(opciones: Pick<Opciones, "escritura"> = {}) {
  const { user, response } = await requireUser(opciones);
  if (response) return { user: null, tenantId: null, response };
  if (user.role !== "DOCTOR") {
    return {
      user: null,
      tenantId: null,
      response: rechazo(403, "No autorizado."),
    };
  }
  return { user, tenantId: getTenantId(user), response: null };
}

// A diferencia de requireUser()/requireDoctor(), nunca llama a
// getTenantId() para el panel admin en sí: un ADMIN puro no tiene tenant,
// ve todas las cuentas. Un DOCTOR/SECRETARY con `isAdmin` sí sigue
// teniendo su propio tenant (ver isPlatformAdmin()); si además necesita
// su tenantId en la misma ruta, lo pide aparte con requireUser().
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "No autorizado." }, { status: 401 }),
    };
  }
  if (!isPlatformAdmin(user)) {
    return {
      user: null,
      response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
    };
  }
  return { user, response: null };
}
