export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { parseBusinessDate } from "@/lib/businessDate";
import { BookingStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser, ResponseError } from "@/lib/server";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const businessDate = req.nextUrl.searchParams.get("businessDate");
    const timeSlot = req.nextUrl.searchParams.get("timeSlot");
    if (!businessDate || !timeSlot) throw new ResponseError("businessDate and timeSlot are required");

    const bookings = await prisma.booking.findMany({
      where: {
        businessDate: parseBusinessDate(businessDate),
        timeSlot,
        status: { not: BookingStatus.DELETED },
      },
      select: { turfNumber: true },
    });
    const bookedTurfs = Array.from(new Set(bookings.map((booking) => booking.turfNumber))).sort();
    const availableTurfs = [1, 2, 3, 4].filter((turf) => !bookedTurfs.includes(turf));

    return NextResponse.json({ bookedTurfs, availableTurfs });
  } catch (error) {
    return jsonError(error);
  }
}
