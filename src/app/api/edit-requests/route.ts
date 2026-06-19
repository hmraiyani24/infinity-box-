export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { EditRequestStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { bookingSnapshot, ensureSlotAvailable, jsonError, parseBookingPayload, requireUser, ResponseError } from "@/lib/server";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const status = req.nextUrl.searchParams.get("status") || EditRequestStatus.PENDING_APPROVAL;
    const bookingId = req.nextUrl.searchParams.get("bookingId");
    const requests = await prisma.bookingEditRequest.findMany({
      where: { status, ...(bookingId ? { bookingId } : {}) },
      include: { booking: true, requestedBy: true, reviewedBy: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const booking = await prisma.booking.findUnique({
      where: { id: String(body.bookingId || "") },
      include: { editRequests: { where: { status: EditRequestStatus.PENDING_APPROVAL } } },
    });
    if (!booking) throw new ResponseError("Booking not found", 404);
    if (booking.createdById !== user.id) throw new ResponseError("Only your own bookings can be edited", 403);
    if (booking.editRequests.length) throw new ResponseError("Edit request already pending", 400);

    const proposed = parseBookingPayload(body);
    await ensureSlotAvailable(proposed, booking.id);

    const request = await prisma.bookingEditRequest.create({
      data: {
        bookingId: booking.id,
        requestedById: user.id,
        originalData: JSON.stringify(bookingSnapshot(booking)),
        proposedData: JSON.stringify({ ...proposed, businessDate: proposed.businessDate.toISOString() }),
      },
    });

    await prisma.auditLog.create({
      data: {
        bookingId: booking.id,
        userId: user.id,
        action: "REQUEST_EDIT",
        after: JSON.stringify({ requestId: request.id }),
      },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
