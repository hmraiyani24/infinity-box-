import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getBusinessDate, parseBusinessDate } from "@/lib/businessDate";
import { BookingStatus, EditRequestStatus, type PaymentMode, type Role } from "@/lib/constants";
import { normalizePhone } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type BookingPayload = {
  businessDate: Date;
  turfNumber: number;
  timeSlot: string;
  timeOverride?: string | null;
  customerName: string;
  phone: string;
  totalAmount: number;
  advanceAmount: number;
  paymentMode: PaymentMode;
  cashAmount: number;
  notes?: string | null;
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isActive) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new ResponseError("Unauthorized", 401);
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) throw new ResponseError("Forbidden", 403);
  return user;
}

export class ResponseError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown) {
  if (error instanceof ResponseError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export function assertAdmin(role: Role) {
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new ResponseError("Admin access required", 403);
}

export function assertSuperAdmin(role: Role) {
  if (role !== "SUPER_ADMIN") throw new ResponseError("Super Admin access required", 403);
}

export function parseBookingPayload(input: Record<string, unknown>): BookingPayload {
  const dateValue = String(input.businessDate || input.date || "");
  const timeSlot = String(input.timeSlot || "");
  const customerName = String(input.customerName || "").trim();
  const phone = normalizePhone(String(input.phone || ""));
  const paymentMode = String(input.paymentMode || "") as PaymentMode;
  const turfNumber = Number(input.turfNumber);
  const totalAmount = Number(input.totalAmount);
  const advanceAmount = Number(input.advanceAmount || 0);
  const cashAmount = Number(input.cashAmount || (paymentMode === "CASH" ? advanceAmount : 0));

  if (!dateValue || !timeSlot || !customerName || !phone) {
    throw new ResponseError("Date, time slot, customer, and phone are required");
  }

  if (!Number.isInteger(turfNumber) || turfNumber < 1 || turfNumber > 4) {
    throw new ResponseError("Invalid turf number");
  }

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new ResponseError("Total amount must be greater than zero");
  }

  if (!Number.isFinite(advanceAmount) || advanceAmount < 0 || advanceAmount > totalAmount) {
    throw new ResponseError("Advance amount is invalid");
  }

  if (!["CASH", "DK_BANK", "HG_BANK", "SPLIT"].includes(paymentMode)) {
    throw new ResponseError("Invalid payment mode");
  }

  if ((paymentMode === "CASH" || paymentMode === "SPLIT") && cashAmount < 0) {
    throw new ResponseError("Cash amount is invalid");
  }

  return {
    businessDate: parseBusinessDate(dateValue),
    turfNumber,
    timeSlot,
    timeOverride: optionalString(input.timeOverride),
    customerName,
    phone,
    totalAmount,
    advanceAmount,
    paymentMode,
    cashAmount,
    notes: optionalString(input.notes),
  };
}

export function bookingSnapshot(booking: {
  businessDate: Date;
  turfNumber: number;
  timeSlot: string;
  timeOverride: string | null;
  customerName: string;
  phone: string;
  totalAmount: number;
  advanceAmount: number;
  paymentMode: string;
  cashAmount: number;
  notes: string | null;
}) {
  return {
    businessDate: booking.businessDate.toISOString(),
    turfNumber: booking.turfNumber,
    timeSlot: booking.timeSlot,
    timeOverride: booking.timeOverride,
    customerName: booking.customerName,
    phone: booking.phone,
    totalAmount: booking.totalAmount,
    advanceAmount: booking.advanceAmount,
    paymentMode: booking.paymentMode,
    cashAmount: booking.cashAmount,
    notes: booking.notes,
  };
}

export function snapshotToBookingUpdate(snapshot: ReturnType<typeof bookingSnapshot>) {
  return {
    businessDate: getBusinessDate(new Date(snapshot.businessDate)),
    turfNumber: snapshot.turfNumber,
    timeSlot: snapshot.timeSlot,
    timeOverride: snapshot.timeOverride,
    customerName: snapshot.customerName,
    phone: normalizePhone(snapshot.phone),
    totalAmount: Number(snapshot.totalAmount),
    advanceAmount: Number(snapshot.advanceAmount),
    paymentMode: snapshot.paymentMode as PaymentMode,
    cashAmount: Number(snapshot.cashAmount || 0),
    notes: snapshot.notes,
  };
}

export async function ensureSlotAvailable(payload: BookingPayload, ignoreBookingId?: string) {
  const conflict = await prisma.booking.findFirst({
    where: {
      businessDate: payload.businessDate,
      turfNumber: payload.turfNumber,
      timeSlot: payload.timeSlot,
      status: { not: BookingStatus.DELETED },
      ...(ignoreBookingId ? { id: { not: ignoreBookingId } } : {}),
    },
  });

  if (conflict) throw new ResponseError("This turf and time slot is already booked");
}

export async function getPendingEditRequestCount() {
  return prisma.bookingEditRequest.count({ where: { status: EditRequestStatus.PENDING_APPROVAL } });
}

function optionalString(value: unknown) {
  const text = String(value || "").trim();
  return text.length ? text : null;
}
