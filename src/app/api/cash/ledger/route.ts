export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/server";

export async function GET(req: NextRequest) {
  try {
    await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
    const supervisorId = req.nextUrl.searchParams.get("supervisorId");
    const entries = await prisma.cashLedger.findMany({
      where: supervisorId ? { supervisorId } : {},
      include: { booking: true, supervisor: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ entries });
  } catch (error) {
    return jsonError(error);
  }
}
