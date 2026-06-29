export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { parseBusinessDate } from "@/lib/businessDate";
import { bookingSnapshot, ensureSlotAvailable, jsonError, parseBookingPayload, requireUser, ResponseError } from "@/lib/server";
import { BookingStatus, type BookingStatus as BookingStatusType } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const params = req.nextUrl.searchParams;
    const businessDate = parseBusinessDate(params.get("businessDate"));
    const from = params.get("from");
    const to = params.get("to");
    const supervisorId = params.get("supervisorId");
    const createdById = params.get("createdById");
    const status = params.get("status");
    const turf = Number(params.get("turfNumber") || params.get("turf") || 0);
    const timeSlot = params.get("timeSlot");
    const statusWhere: BookingStatusType | { not: BookingStatusType } =
      status && status !== "all" ? (status as BookingStatusType) : { not: BookingStatus.DELETED };

    const bookings = await prisma.booking.findMany({
      where: {
        businessDate: from && to ? { gte: parseBusinessDate(from), lte: parseBusinessDate(to) } : businessDate,
        status: statusWhere,
        ...(turf ? { turfNumber: turf } : {}),
        ...(timeSlot ? { timeSlot } : {}),
        ...(supervisorId || createdById ? { createdById: supervisorId || createdById || undefined } : {}),
        ...(user.role === "SUPERVISOR" && supervisorId ? { createdById: user.id } : {}),
      },
      include: {
        createdBy: true,
        editRequests: { where: { status: "PENDING_APPROVAL" } },
      },
      orderBy: [{ turfNumber: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role === "VIEWER") throw new ResponseError("Viewer access is read-only", 403);
    const payload = parseBookingPayload(await req.json());
    await ensureSlotAvailable(payload);

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          ...payload,
          staffName: user.displayName,
          createdById: user.id,
          status: user.role === "SUPERVISOR" ? "PENDING" : "CONFIRMED",
          verifiedById: user.role === "SUPERVISOR" ? null : user.id,
          verifiedAt: user.role === "SUPERVISOR" ? null : new Date(),
        },
      });

      if (payload.cashAmount > 0) {
        await tx.cashLedger.create({
          data: {
            supervisorId: user.role === "SUPERVISOR" ? user.id : user.id,
            bookingId: created.id,
            cashAmount: payload.cashAmount,
            businessDate: payload.businessDate,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          bookingId: created.id,
          userId: user.id,
          action: "CREATE",
          after: JSON.stringify(bookingSnapshot(created)),
        },
      });

      return created;
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
