export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createBackup } from "@/lib/backup";
import { Role } from "@/lib/constants";
import { jsonError, requireRole } from "@/lib/server";

export async function POST() {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const backup = createBackup();
    return NextResponse.json({ success: true, filename: backup.filename });
  } catch (error) {
    return jsonError(error);
  }
}
