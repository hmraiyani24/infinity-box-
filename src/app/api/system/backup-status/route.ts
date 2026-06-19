export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getBackupStatus } from "@/lib/backup";
import { Role } from "@/lib/constants";
import { jsonError, requireRole } from "@/lib/server";

export async function GET() {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    return NextResponse.json(getBackupStatus());
  } catch (error) {
    return jsonError(error);
  }
}
