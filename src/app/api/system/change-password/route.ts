import { NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { compareSecret, hashSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, ResponseError } from "@/lib/server";

export async function PATCH(req: Request) {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const body = await req.json();
    const userId = String(body.userId || "");
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!userId || !currentPassword || newPassword.length < 8) {
      throw new ResponseError("Current password and a new 8+ character password are required");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new ResponseError("User password is not configured", 400);

    const valid = await compareSecret(currentPassword, user.passwordHash);
    if (!valid) throw new ResponseError("Current password is incorrect", 400);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashSecret(newPassword), isFirstLogin: false, otpHash: null, otpExpiresAt: null, otpUsed: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
