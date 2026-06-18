import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/server";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const requestedSupervisorId = req.nextUrl.searchParams.get("supervisorId");
    const supervisorId = user.role === Role.SUPERVISOR ? user.id : requestedSupervisorId || user.id;
    const result = await prisma.cashLedger.aggregate({
      where: { supervisorId, isSettled: false },
      _sum: { cashAmount: true },
    });
    return NextResponse.json({ supervisorId, balance: result._sum.cashAmount ?? 0 });
  } catch (error) {
    return jsonError(error);
  }
}
