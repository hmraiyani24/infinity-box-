import { NextRequest, NextResponse } from "next/server";
import { EditRequestStatus, Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, ResponseError } from "@/lib/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
    const { reason } = await req.json();
    if (!String(reason || "").trim()) throw new ResponseError("Reject reason is required", 400);

    const request = await prisma.bookingEditRequest.findUnique({ where: { id: params.id } });
    if (!request) throw new ResponseError("Request not found", 404);
    if (request.status !== EditRequestStatus.PENDING_APPROVAL) throw new ResponseError("Request already reviewed", 400);

    const updated = await prisma.bookingEditRequest.update({
      where: { id: request.id },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectReason: String(reason),
      },
    });

    await prisma.auditLog.create({
      data: {
        bookingId: request.bookingId,
        userId: user.id,
        action: "REJECT_EDIT",
        before: request.proposedData,
        after: JSON.stringify({ reason }),
      },
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    return jsonError(error);
  }
}
