import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { getAnalytics } from "@/lib/dashboard";
import { jsonError, requireRole } from "@/lib/server";

export async function GET(req: NextRequest) {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const period = req.nextUrl.searchParams.get("period") || "day";
    const date = new Date(req.nextUrl.searchParams.get("date") || Date.now());
    const analytics = await getAnalytics(period, date);
    return NextResponse.json(analytics);
  } catch (error) {
    return jsonError(error);
  }
}
