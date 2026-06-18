import { endOfDay, endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";
import { BookingStatus, EditRequestStatus, PaymentMode, Role, type PaymentMode as PaymentModeType } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function getCanvasData(businessDate: Date) {
  const bookings = await prisma.booking.findMany({
    where: { businessDate, status: { not: BookingStatus.DELETED } },
    include: {
      createdBy: true,
      editRequests: {
        where: { status: EditRequestStatus.PENDING_APPROVAL },
        select: { id: true },
      },
    },
    orderBy: [{ turfNumber: "asc" }, { timeSlot: "asc" }],
  });

  const totals = bookings.reduce(
    (summary, booking) => {
      summary.total += booking.totalAmount;
      summary.count += 1;
      const paymentMode = booking.paymentMode as PaymentModeType;
      summary[paymentMode] += booking.totalAmount;
      if (booking.status === BookingStatus.PENDING) summary.pending += 1;
      return summary;
    },
    { total: 0, count: 0, pending: 0, CASH: 0, DK_BANK: 0, HG_BANK: 0, SPLIT: 0 } as Record<PaymentModeType, number> & {
      total: number;
      count: number;
      pending: number;
    },
  );

  const pendingEditRequests = await prisma.bookingEditRequest.count({
    where: { status: EditRequestStatus.PENDING_APPROVAL },
  });

  return { bookings, totals, pendingEditRequests };
}

export async function getCashSummary(supervisorId?: string) {
  const groups = await prisma.cashLedger.groupBy({
    by: ["supervisorId"],
    where: {
      isSettled: false,
      ...(supervisorId ? { supervisorId } : {}),
    },
    _sum: { cashAmount: true },
  });

  const users = await prisma.user.findMany({
    where: { role: Role.SUPERVISOR, ...(supervisorId ? { id: supervisorId } : {}) },
    orderBy: { displayName: "asc" },
  });

  return users.map((user) => ({
    user,
    unsettledCash: groups.find((group) => group.supervisorId === user.id)?._sum.cashAmount ?? 0,
  }));
}

export async function getAnalytics(period = "day", date = new Date()) {
  const range = getDateRange(period, date);
  const bookings = await prisma.booking.findMany({
    where: {
      status: { not: BookingStatus.DELETED },
      businessDate: { gte: range.start, lte: range.end },
    },
  });

  const paymentTotals = bookings.reduce(
    (summary, booking) => {
      const paymentMode = booking.paymentMode as PaymentModeType;
      summary[paymentMode] += booking.totalAmount;
      summary.total += booking.totalAmount;
      summary.count += 1;
      return summary;
    },
    { total: 0, count: 0, CASH: 0, DK_BANK: 0, HG_BANK: 0, SPLIT: 0 } as Record<PaymentModeType, number> & {
      total: number;
      count: number;
    },
  );

  return { range, paymentTotals, bookings };
}

export async function getTopClients() {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: BookingStatus.DELETED } },
    orderBy: { businessDate: "desc" },
  });

  const clients = new Map<
    string,
    { name: string; phone: string; totalSpent: number; visitCount: number; lastVisit: Date }
  >();

  for (const booking of bookings) {
    const current = clients.get(booking.phone);
    if (current) {
      current.totalSpent += booking.totalAmount;
      current.visitCount += 1;
      if (booking.businessDate > current.lastVisit) current.lastVisit = booking.businessDate;
    } else {
      clients.set(booking.phone, {
        name: booking.customerName,
        phone: booking.phone,
        totalSpent: booking.totalAmount,
        visitCount: 1,
        lastVisit: booking.businessDate,
      });
    }
  }

  return Array.from(clients.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 30);
}

function getDateRange(period: string, date: Date) {
  if (period === "month") return { start: startOfMonth(date), end: endOfMonth(date) };
  if (period === "year") return { start: startOfYear(date), end: endOfYear(date) };
  return { start: date, end: endOfDay(date) };
}
