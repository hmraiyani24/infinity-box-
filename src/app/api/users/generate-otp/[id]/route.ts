export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { generateOtp, getOtpExpiry, hashSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole([Role.SUPER_ADMIN]);
    const otp = generateOtp();
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        otpHash: await hashSecret(otp),
        otpExpiresAt: getOtpExpiry(),
        otpUsed: false,
        isFirstLogin: true,
        passwordHash: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "REGENERATE_OTP",
        after: JSON.stringify({ userId: user.id }),
      },
    });

    return NextResponse.json({ user, otp });
  } catch (error) {
    return jsonError(error);
  }
}
