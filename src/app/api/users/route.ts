export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { generateOtp, getOtpExpiry, hashSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, ResponseError } from "@/lib/server";

export async function GET() {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const users = await prisma.user.findMany({ orderBy: { displayName: "asc" } });
    return NextResponse.json({ users });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole([Role.SUPER_ADMIN]);
    const body = await req.json();
    const role = String(body.role || Role.SUPERVISOR);
    if (role !== Role.SUPERVISOR && role !== Role.ADMIN) throw new ResponseError("Invalid role", 400);

    const otp = generateOtp();
    const user = await prisma.user.create({
      data: {
        username: String(body.username || "").trim().toLowerCase(),
        displayName: String(body.displayName || "").trim(),
        role,
        passwordHash: null,
        isFirstLogin: true,
        otpHash: await hashSecret(otp),
        otpExpiresAt: getOtpExpiry(),
        otpUsed: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "CREATE_USER",
        after: JSON.stringify({ userId: user.id, role: user.role }),
      },
    });

    return NextResponse.json({ user, otp }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
