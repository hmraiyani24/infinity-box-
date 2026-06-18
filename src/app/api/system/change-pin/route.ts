import { NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { compareSecret, hashSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, ResponseError } from "@/lib/server";

export async function PATCH(req: Request) {
  try {
    await requireRole([Role.SUPER_ADMIN]);
    const body = await req.json();
    const currentPin = String(body.currentPin || "");
    const newPin = String(body.newPin || "");

    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) {
      throw new ResponseError("PIN must be exactly 4 digits");
    }

    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    if (!settings?.adminPin) throw new ResponseError("Admin PIN is not configured", 400);

    const valid = await compareSecret(currentPin, settings.adminPin);
    if (!valid) throw new ResponseError("Current PIN is incorrect", 400);

    await prisma.settings.update({
      where: { id: "singleton" },
      data: { adminPin: await hashSecret(newPin) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
