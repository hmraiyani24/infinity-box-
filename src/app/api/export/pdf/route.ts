export const dynamic = "force-dynamic";

import { endOfMonth, endOfYear, format, startOfMonth, startOfYear } from "date-fns";
import { Role } from "@/lib/constants";
import { buildPdfBuffer } from "@/lib/exportHelpers";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/server";

export async function GET(req: Request) {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const { start, end, sheetTitle } = getRange(new URL(req.url));
    const bookings = await prisma.booking.findMany({
      where: { businessDate: { gte: start, lte: end }, status: { not: "DELETED" } },
      orderBy: [{ businessDate: "asc" }, { turfNumber: "asc" }],
    });
    const rows = bookings.map((booking) => ({
      ...booking,
      businessDate: booking.businessDate.toISOString().slice(0, 10),
      createdAt: booking.createdAt.toISOString(),
      verifiedAt: booking.verifiedAt?.toISOString() ?? null,
    }));
    const buffer = await buildPdfBuffer(rows, sheetTitle);

    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="InfinityBox_${safeName(sheetTitle)}.pdf"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

function getRange(url: URL) {
  const period = url.searchParams.get("period") || "month";
  if (period === "day") {
    const date = new Date(`${url.searchParams.get("date") || format(new Date(), "yyyy-MM-dd")}T00:00:00`);
    return { start: date, end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59), sheetTitle: format(date, "dd MMM yy") };
  }
  if (period === "year") {
    const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()), 10);
    const date = new Date(year, 0, 1);
    return { start: startOfYear(date), end: endOfYear(date), sheetTitle: String(year) };
  }
  const month = parseInt(url.searchParams.get("month") || String(new Date().getMonth() + 1), 10);
  const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()), 10);
  const date = new Date(year, month - 1, 1);
  return { start: startOfMonth(date), end: endOfMonth(date), sheetTitle: format(date, "MMMM yyyy") };
}

function safeName(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "_");
}
