import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  }
  return { user, response: null };
}
