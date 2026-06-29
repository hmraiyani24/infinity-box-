export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { format, subMonths } from "date-fns";
import { Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/server";

export async function GET(req: Request) {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const url = new URL(req.url);
    const months = parseInt(url.searchParams.get("months") ?? "12", 10);
    const since = subMonths(new Date(), months);

    const bookings = await prisma.booking.findMany({
      where: { status: { not: "DELETED" }, businessDate: { gte: since } },
      select: { businessDate: true, totalAmount: true, advanceAmount: true, advancePaymentMode: true },
      orderBy: { businessDate: "asc" },
    });

    const byMonth: Record<string, { total: number; cash: number; dkBank: number; hgBank: number }> = {};
    for (const booking of bookings) {
      const key = format(new Date(booking.businessDate), "MMM yy");
      byMonth[key] ??= { total: 0, cash: 0, dkBank: 0, hgBank: 0 };
      byMonth[key].total += booking.totalAmount;
      if (booking.advancePaymentMode === "CASH") byMonth[key].cash += booking.advanceAmount;
      if (booking.advancePaymentMode === "DK_BANK") byMonth[key].dkBank += booking.advanceAmount;
      if (booking.advancePaymentMode === "HG_BANK") byMonth[key].hgBank += booking.advanceAmount;
    }

    const allBookings = await prisma.booking.findMany({
      where: { status: { not: "DELETED" } },
      select: { businessDate: true, totalAmount: true },
    });
    const byDay: Record<string, number> = {};
    for (const booking of allBookings) {
      const key = booking.businessDate.toISOString().slice(0, 10);
      byDay[key] = (byDay[key] ?? 0) + booking.totalAmount;
    }
    const bestDayKey = Object.keys(byDay).sort((a, b) => byDay[b] - byDay[a])[0];
    const bestDay = { date: bestDayKey ?? "—", amount: bestDayKey ? byDay[bestDayKey] : 0 };

    const byMonthKey: Record<string, number> = {};
    for (const booking of allBookings) {
      const key = booking.businessDate.toISOString().slice(0, 7);
      byMonthKey[key] = (byMonthKey[key] ?? 0) + booking.totalAmount;
    }
    const bestMonthKey = Object.keys(byMonthKey).sort((a, b) => byMonthKey[b] - byMonthKey[a])[0];
    const bestMonth = {
      label: bestMonthKey ? format(new Date(`${bestMonthKey}-01`), "MMMM yyyy") : "—",
      amount: bestMonthKey ? byMonthKey[bestMonthKey] : 0,
    };

    return NextResponse.json({
      monthlyTrend: Object.entries(byMonth).map(([month, value]) => ({ month, ...value })),
      bestDay,
      bestMonth,
    });
  } catch (error) {
    return jsonError(error);
  }
}
