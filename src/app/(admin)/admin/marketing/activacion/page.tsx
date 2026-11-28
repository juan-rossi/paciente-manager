import { verificarAdminEnPagina } from "@/lib/admin-page";
export default async function Proximamente1Page() {
  await verificarAdminEnPagina();
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
      Próximamente.
    </div>
  );
}
