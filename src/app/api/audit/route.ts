import { NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/server";

export async function GET() {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const logs = await prisma.auditLog.findMany({ include: { user: true }, orderBy: { timestamp: "desc" }, take: 200 });
    return NextResponse.json({ logs });
  } catch (error) {
    return jsonError(error);
  }
}
