import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getBusinessDate, parseBusinessDate } from "@/lib/businessDate";
import { BookingStatus, EditRequestStatus, getEffectiveSlotRange, rangesOverlap, type PaymentMode, type Role } from "@/lib/constants";
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
  advancePaymentMode: PaymentMode;
  cashPortion?: number | null;
  cashAmount: number;
  referenceName?: string | null;
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
  const advancePaymentMode = String(input.advancePaymentMode || input.paymentMode || "CASH") as PaymentMode;
  const turfNumber = Number(input.turfNumber);
  const totalAmount = Number(input.totalAmount);
  const advanceAmount = Number(input.advanceAmount || 0);
  const cashPortion = input.cashPortion === undefined || input.cashPortion === null || input.cashPortion === ""
    ? null
    : Number(input.cashPortion);
  const cashAmount = Number(input.cashAmount || (advancePaymentMode === "CASH" ? advanceAmount : cashPortion || 0));

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

  if (!["CASH", "DK_BANK", "HG_BANK", "SPLIT"].includes(advancePaymentMode)) {
    throw new ResponseError("Invalid payment mode");
  }

  if ((advancePaymentMode === "CASH" || advancePaymentMode === "SPLIT") && cashAmount < 0) {
    throw new ResponseError("Cash amount is invalid");
  }

  if (cashPortion !== null && (!Number.isFinite(cashPortion) || cashPortion < 0 || cashPortion > advanceAmount)) {
    throw new ResponseError("Cash portion is invalid");
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
    advancePaymentMode,
    cashPortion,
    cashAmount,
    referenceName: optionalString(input.referenceName),
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
  advancePaymentMode: string;
  cashPortion: number | null;
  cashAmount: number;
  referenceName: string | null;
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
    advancePaymentMode: booking.advancePaymentMode,
    cashPortion: booking.cashPortion,
    cashAmount: booking.cashAmount,
    referenceName: booking.referenceName,
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
    advancePaymentMode: snapshot.advancePaymentMode as PaymentMode,
    cashPortion: snapshot.cashPortion === null || snapshot.cashPortion === undefined ? null : Number(snapshot.cashPortion),
    cashAmount: Number(snapshot.cashAmount || 0),
    referenceName: snapshot.referenceName,
    notes: snapshot.notes,
  };
}

export async function ensureSlotAvailable(payload: BookingPayload, ignoreBookingId?: string) {
  const existingBookings = await prisma.booking.findMany({
    where: {
      businessDate: payload.businessDate,
      turfNumber: payload.turfNumber,
      status: { not: BookingStatus.DELETED },
      ...(ignoreBookingId ? { id: { not: ignoreBookingId } } : {}),
    },
  });
  const requestedRange = getEffectiveSlotRange(payload);
  const conflict = existingBookings.find((booking) => rangesOverlap(requestedRange, getEffectiveSlotRange(booking)));

  if (conflict) throw new ResponseError("This turf and time slot is already booked");
}

export async function getPendingEditRequestCount() {
  return prisma.bookingEditRequest.count({ where: { status: EditRequestStatus.PENDING_APPROVAL } });
}

function optionalString(value: unknown) {
  const text = String(value || "").trim();
  return text.length ? text : null;
}
