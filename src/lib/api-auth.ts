import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { isPlatformAdmin } from "@/lib/admin-access";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      tenantId: null,
      response: NextResponse.json({ error: "No autorizado." }, { status: 401 }),
    };
  }
  return { user, tenantId: getTenantId(user), response: null };
}

export async function requireDoctor() {
  const { user, response } = await requireUser();
  if (response) return { user: null, tenantId: null, response };
  if (user.role !== "DOCTOR") {
    return {
      user: null,
      tenantId: null,
      response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
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
