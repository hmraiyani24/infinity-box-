import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/constants";
import { compareSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/server";

export async function POST(req: NextRequest) {
  try {
    await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
    const { pin } = await req.json();
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    const valid = Boolean(settings && await compareSecret(String(pin || ""), settings.adminPin));
    return NextResponse.json({ valid }, { status: valid ? 200 : 403 });
  } catch (error) {
    return jsonError(error);
  }
}
