import { NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { getTopClients } from "@/lib/dashboard";
import { jsonError, requireRole } from "@/lib/server";

export async function GET() {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    return NextResponse.json({ clients: await getTopClients() });
  } catch (error) {
    return jsonError(error);
  }
}
