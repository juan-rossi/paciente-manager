import { requireDoctor } from "@/lib/api-auth";
import { exportarHistoriaClinica } from "@/lib/exportar-historia-clinica";

export async function GET() {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  return exportarHistoriaClinica(tenantId, user.id);
}
