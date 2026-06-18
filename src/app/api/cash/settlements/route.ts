import { NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/server";

export async function GET() {
  try {
    await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
    const settlements = await prisma.cashSettlement.findMany({
      include: { supervisor: true, settledBy: true },
      orderBy: { settledAt: "desc" },
    });
    return NextResponse.json({ settlements });
  } catch (error) {
    return jsonError(error);
  }
}
