import { requireDoctor } from "@/lib/api-auth";
import { exportarHistoriaClinica } from "@/lib/exportar-historia-clinica";

// Cuentas grandes: el export se genera en streaming y puede tardar (ver exportar-historia-clinica.ts).
export const maxDuration = 300;

export async function GET() {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  return exportarHistoriaClinica(tenantId, user.id);
}
