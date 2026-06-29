export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { compareSecret, hashSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim().toLowerCase();
  const adminPin = String(body.adminPin || "");
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!username || !adminPin || !password || !confirmPassword) {
    return NextResponse.json({ error: "Username, Admin PIN, and new password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const pinValid = Boolean(settings && (await compareSecret(adminPin, settings.adminPin)));
  if (!pinValid) {
    return NextResponse.json({ error: "Invalid Admin PIN" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Active user not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashSecret(password),
      isFirstLogin: false,
      otpHash: null,
      otpExpiresAt: null,
      otpUsed: true,
    },
  });

  return NextResponse.json({ ok: true });
}
