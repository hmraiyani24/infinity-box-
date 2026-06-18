import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/server";

export async function GET() {
  try {
    await requireRole([Role.SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN]);
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole([Role.SUPER_ADMIN]);
    const body = await req.json();
    const settings = await prisma.settings.update({
      where: { id: "singleton" },
      data: {
        ...(body.turfs ? { turfs: JSON.stringify(body.turfs) } : {}),
        ...(body.timeSlots ? { timeSlots: JSON.stringify(body.timeSlots) } : {}),
        ...(body.paymentModes ? { paymentModes: JSON.stringify(body.paymentModes) } : {}),
      },
    });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "UPDATE_SETTINGS", after: JSON.stringify(body) },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}
