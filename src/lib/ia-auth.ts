import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/api-auth";
import { esActivo, isPremium } from "@/lib/plan";

// Dictado y resumen con IA son funciones Premium con costo por uso: además de
// ocultar los botones en la UI, los endpoints `/api/ia/*` lo validan acá para
// que un médico sin Premium vigente no pueda llamarlos directo.
export async function requirePremiumDoctor() {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return { user: null, tenantId: null, response };
  if (!isPremium(user) || !esActivo(user)) {
    return {
      user: null,
      tenantId: null,
      response: NextResponse.json(
        { error: "Esta función requiere el plan Premium vigente." },
        { status: 403 }
      ),
    };
  }
  return { user, tenantId, response: null };
}
