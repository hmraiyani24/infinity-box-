export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { EditRequestStatus, Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, ResponseError, snapshotToBookingUpdate } from "@/lib/server";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
    const request = await prisma.bookingEditRequest.findUnique({ where: { id: params.id }, include: { booking: true } });
    if (!request) throw new ResponseError("Request not found", 404);
    if (request.status !== EditRequestStatus.PENDING_APPROVAL) throw new ResponseError("Request already reviewed", 400);

    const proposed = JSON.parse(request.proposedData);
    const booking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: request.bookingId },
        data: {
          ...snapshotToBookingUpdate(proposed),
          lastEditedById: user.id,
          lastEditedAt: new Date(),
          lastEditedByName: user.displayName,
        },
      });
      await tx.bookingEditRequest.update({
        where: { id: request.id },
        data: {
          status: EditRequestStatus.APPROVED,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          bookingId: request.bookingId,
          userId: user.id,
          action: "APPROVE_EDIT",
          before: request.originalData,
          after: request.proposedData,
        },
      });
      return updated;
    });

    return NextResponse.json({ booking });
  } catch (error) {
    return jsonError(error);
  }
}
