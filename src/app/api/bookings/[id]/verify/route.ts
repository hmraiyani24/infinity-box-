import { NextResponse } from "next/server";
import { BookingStatus, Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, ResponseError } from "@/lib/server";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
    const booking = await prisma.booking.findUnique({ where: { id: params.id } });
    if (!booking) throw new ResponseError("Booking not found", 404);

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: BookingStatus.CONFIRMED,
        verifiedById: user.id,
        verifiedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        bookingId: updated.id,
        userId: user.id,
        action: "VERIFY",
        before: JSON.stringify({ status: booking.status }),
        after: JSON.stringify({ status: updated.status }),
      },
    });

    return NextResponse.json({ booking: updated });
  } catch (error) {
    return jsonError(error);
  }
}
