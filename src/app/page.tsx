import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { TURNOS_ENABLED } from "@/lib/feature-flags";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(TURNOS_ENABLED && user.role !== "DOCTOR" ? "/turnos" : "/dashboard");
}
