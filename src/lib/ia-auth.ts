import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/api-auth";
import { alcanzoTopeIA, mensajeTopeIA } from "@/lib/ia-tope";
import { esActivo, isPremium } from "@/lib/plan";

// `code` del 429 cuando el médico alcanzó el tope mensual: el cliente del
// dictado lo usa para mostrar ese mensaje en vez del error genérico.
export const CODIGO_TOPE_IA = "tope_ia";

// Dictado y resumen con IA son funciones Premium con costo por uso: además de
// ocultar los botones en la UI, los endpoints `/api/ia/*` lo validan acá para
// que un médico sin Premium vigente no pueda llamarlos directo. También corta
// al médico que ya alcanzó su tope de gasto del mes (ver `alcanzoTopeIA`).
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
  if (await alcanzoTopeIA(user)) {
    return {
      user: null,
      tenantId: null,
      response: NextResponse.json({ error: mensajeTopeIA(), code: CODIGO_TOPE_IA }, { status: 429 }),
    };
  }
  return { user, tenantId, response: null };
}
