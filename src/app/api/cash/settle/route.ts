export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { compareSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, ResponseError } from "@/lib/server";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
    const { supervisorId, pin, notes } = await req.json();
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    if (!settings || !(await compareSecret(String(pin || ""), settings.adminPin))) {
      throw new ResponseError("Invalid PIN", 403);
    }

    const entries = await prisma.cashLedger.findMany({
      where: { supervisorId: String(supervisorId), isSettled: false },
      orderBy: { businessDate: "asc" },
    });
    if (!entries.length) throw new ResponseError("No unsettled cash found", 400);

    const total = entries.reduce((sum, entry) => sum + entry.cashAmount, 0);
    const settlement = await prisma.$transaction(async (tx) => {
      const created = await tx.cashSettlement.create({
        data: {
          supervisorId: String(supervisorId),
          settledById: user.id,
          totalAmount: total,
          fromDate: entries[0].businessDate,
          toDate: entries[entries.length - 1].businessDate,
          notes: String(notes || "Cash cleared"),
        },
      });
      await tx.cashLedger.updateMany({
        where: { id: { in: entries.map((entry) => entry.id) } },
        data: { isSettled: true, settlementId: created.id },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SETTLE_CASH",
          after: JSON.stringify({ supervisorId, total }),
        },
      });
      return created;
    });

    return NextResponse.json({ settlement });
  } catch (error) {
    return jsonError(error);
  }
}
