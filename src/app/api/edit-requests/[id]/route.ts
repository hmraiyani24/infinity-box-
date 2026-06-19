export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, ResponseError } from "@/lib/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
    const request = await prisma.bookingEditRequest.findUnique({
      where: { id: params.id },
      include: { booking: true, requestedBy: true, reviewedBy: true },
    });
    if (!request) throw new ResponseError("Request not found", 404);
    return NextResponse.json({ request });
  } catch (error) {
    return jsonError(error);
  }
}
