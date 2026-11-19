import { redirect } from "next/navigation";
import { verificarAdminEnPagina } from "@/lib/admin-page";

export default async function MarketingPage() {
  await verificarAdminEnPagina();
  redirect("/admin/marketing/bienvenidas");
}
