import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  }
  return { user, response: null };
}

export async function requireDoctor() {
  const { user, response } = await requireUser();
  if (response) return { user: null, response };
  if (user.role !== "DOCTOR") {
    return { user: null, response: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }
  return { user, response: null };
}
