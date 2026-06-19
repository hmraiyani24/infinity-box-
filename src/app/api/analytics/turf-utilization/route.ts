export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Role, TURF_COLORS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/server";

export async function GET(req: Request) {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const url = new URL(req.url);
    const monthParam = url.searchParams.get("month");
    const yearParam = url.searchParams.get("year");
    const where: { status: { not: string }; businessDate?: { gte: Date; lte: Date } } = { status: { not: "DELETED" } };

    if (monthParam && yearParam) {
      const month = parseInt(monthParam, 10);
      const year = parseInt(yearParam, 10);
      where.businessDate = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0, 23, 59, 59),
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      select: { turfNumber: true, totalAmount: true },
    });
    const total = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    const result = [1, 2, 3, 4].map((turfNumber) => {
      const turfBookings = bookings.filter((booking) => booking.turfNumber === turfNumber);
      const revenue = turfBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
      return {
        turf: `Turf ${turfNumber}`,
        bookings: turfBookings.length,
        revenue,
        pct: total ? (revenue / total) * 100 : 0,
        color: TURF_COLORS[turfNumber].dot,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
