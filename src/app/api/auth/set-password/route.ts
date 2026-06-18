import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hashSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.needsPasswordSetup) {
    return NextResponse.json({ error: "Password setup session required" }, { status: 401 });
  }

  const body = await req.json();
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
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
