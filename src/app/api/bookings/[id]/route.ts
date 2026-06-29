export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, Role } from "@/lib/constants";
import { normalizePhone } from "@/lib/format";
import { compareSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { bookingSnapshot, jsonError, requireRole, ResponseError } from "@/lib/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole([Role.SUPER_ADMIN]);
    const body = await req.json();
    const before = await prisma.booking.findUnique({ where: { id: params.id } });
    if (!before || before.status === BookingStatus.DELETED) throw new ResponseError("Booking not found", 404);

    if (body.turfNumber || body.timeSlot || body.businessDate) {
      const turfNumber = body.turfNumber ? Number(body.turfNumber) : before.turfNumber;
      const timeSlot = body.timeSlot ?? before.timeSlot;
      const businessDate = body.businessDate ? new Date(body.businessDate) : before.businessDate;

      if (!body.forceOverride) {
        const conflict = await prisma.booking.findFirst({
          where: {
            id: { not: params.id },
            turfNumber,
            timeSlot,
            businessDate,
            status: { not: BookingStatus.DELETED },
          },
        });

        if (conflict) {
          return NextResponse.json({ error: "CONFLICT", conflictWith: conflict }, { status: 409 });
        }
      }
    }

    const updateData = {
      ...(body.customerName !== undefined ? { customerName: String(body.customerName).trim() } : {}),
      ...(body.phone !== undefined ? { phone: normalizePhone(String(body.phone)) } : {}),
      ...(body.turfNumber !== undefined ? { turfNumber: Number(body.turfNumber) } : {}),
      ...(body.businessDate !== undefined ? { businessDate: new Date(body.businessDate) } : {}),
      ...(body.timeSlot !== undefined ? { timeSlot: String(body.timeSlot) } : {}),
      ...(body.timeOverride !== undefined ? { timeOverride: body.timeOverride ? String(body.timeOverride) : null } : {}),
      ...(body.totalAmount !== undefined ? { totalAmount: Number(body.totalAmount) } : {}),
      ...(body.advanceAmount !== undefined ? { advanceAmount: Number(body.advanceAmount) } : {}),
      ...(body.advancePaymentMode !== undefined || body.paymentMode !== undefined ? { advancePaymentMode: String(body.advancePaymentMode || body.paymentMode) } : {}),
      ...(body.cashPortion !== undefined ? { cashPortion: body.cashPortion === null || body.cashPortion === "" ? null : Number(body.cashPortion) } : {}),
      ...(body.cashAmount !== undefined ? { cashAmount: Number(body.cashAmount) } : {}),
      ...(body.referenceName !== undefined ? { referenceName: body.referenceName ? String(body.referenceName) : null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes ? String(body.notes) : null } : {}),
      lastEditedById: user.id,
      lastEditedAt: new Date(),
      lastEditedByName: user.displayName,
    };

    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        bookingId: booking.id,
        userId: user.id,
        action: "EDIT",
        before: JSON.stringify(bookingSnapshot(before)),
        after: JSON.stringify(bookingSnapshot(booking)),
      },
    });

    return NextResponse.json({
      ...booking,
      businessDate: booking.businessDate.toISOString().slice(0, 10),
      createdAt: booking.createdAt.toISOString(),
      verifiedAt: booking.verifiedAt?.toISOString() ?? null,
      editRequests: [],
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
    const { pin, reason } = await req.json();
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    if (!settings || !(await compareSecret(String(pin || ""), settings.adminPin))) {
      throw new ResponseError("Invalid PIN", 403);
    }

    const existing = await prisma.booking.findUnique({ where: { id: params.id } });
    if (!existing) throw new ResponseError("Booking not found", 404);

    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: BookingStatus.DELETED,
        deletedById: user.id,
        deletedAt: new Date(),
        deleteReason: String(reason || "Deleted"),
      },
    });

    await prisma.auditLog.create({
      data: {
        bookingId: booking.id,
        userId: user.id,
        action: "DELETE",
        before: JSON.stringify(bookingSnapshot(existing)),
        after: JSON.stringify({ status: BookingStatus.DELETED, reason }),
      },
    });

    return NextResponse.json({ booking });
  } catch (error) {
    return jsonError(error);
  }
}
