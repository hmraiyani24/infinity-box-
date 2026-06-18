import fs from "fs";
import path from "path";
import { getLatestBackupPath } from "@/lib/backup";
import { Role } from "@/lib/constants";
import { jsonError, requireRole, ResponseError } from "@/lib/server";

export async function GET() {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const latest = getLatestBackupPath();
    if (!latest) throw new ResponseError("No backup file found", 404);

    const buffer = fs.readFileSync(latest);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${path.basename(latest)}"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
