import { NextResponse } from "next/server";
import { Role, TIME_SLOTS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/server";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function GET(req: Request) {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const url = new URL(req.url);
    const now = new Date();
    const month = parseInt(url.searchParams.get("month") ?? String(now.getMonth() + 1), 10);
    const year = parseInt(url.searchParams.get("year") ?? String(now.getFullYear()), 10);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const bookings = await prisma.booking.findMany({
      where: { businessDate: { gte: start, lte: end }, status: { not: "DELETED" } },
      select: { timeSlot: true, businessDate: true },
    });

    const result: Record<string, Record<string, number>> = {};
    for (const slot of TIME_SLOTS) {
      result[slot] = Object.fromEntries(DAYS.map((day) => [day, 0]));
    }
    for (const booking of bookings) {
      const dayIdx = (new Date(booking.businessDate).getDay() + 6) % 7;
      const dayKey = DAYS[dayIdx];
      if (result[booking.timeSlot]) result[booking.timeSlot][dayKey] += 1;
    }
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
