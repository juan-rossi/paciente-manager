import { getGastos } from "@/lib/admin-gastos";
import { GastosScreen } from "@/components/admin/gastos-screen";
import { PageEnter } from "@/components/page-transition";

export const dynamic = "force-dynamic";

export default async function AdminGastosPage() {
  const gastos = (await getGastos()).map((g) => ({
    id: g.id,
    fecha: g.fecha.toISOString(),
    descripcion: g.descripcion,
    monto: g.monto,
  }));

  return (
    <PageEnter>
      <GastosScreen initialGastos={gastos} />
    </PageEnter>
  );
}
