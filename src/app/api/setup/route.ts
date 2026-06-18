import { NextResponse } from "next/server";
import { TIME_SLOTS } from "@/lib/constants";
import { hashSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";

type SetupBody = {
  superAdminPassword?: string;
  adminPassword?: string;
  adminPin?: string;
  supervisorPasswords?: Record<string, string>;
};

const supervisorUsernames = ["rakesh", "hiren", "nikunj", "hardik"];

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ isSetupComplete: Boolean(settings?.isSetupComplete) });
}

export async function POST(req: Request) {
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      adminPin: "",
      turfs: JSON.stringify(["Turf 1", "Turf 2", "Turf 3", "Turf 4"]),
      timeSlots: JSON.stringify(TIME_SLOTS),
      paymentModes: JSON.stringify(["CASH", "DK_BANK", "HG_BANK", "SPLIT"]),
      isSetupComplete: false,
    },
    update: {},
  });

  if (settings.isSetupComplete) {
    return NextResponse.json({ error: "Setup is already complete" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as SetupBody;
  const errors = validateSetupBody(body);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "Please fix the highlighted fields", errors }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { username: "superadmin" },
      data: {
        passwordHash: await hashSecret(body.superAdminPassword!),
        isFirstLogin: false,
        otpHash: null,
        otpExpiresAt: null,
        otpUsed: true,
      },
    });

    await tx.user.update({
      where: { username: "admin" },
      data: {
        passwordHash: await hashSecret(body.adminPassword!),
        isFirstLogin: false,
        otpHash: null,
        otpExpiresAt: null,
        otpUsed: true,
      },
    });

    for (const username of supervisorUsernames) {
      await tx.user.update({
        where: { username },
        data: {
          passwordHash: await hashSecret(body.supervisorPasswords![username]),
          isFirstLogin: false,
          otpHash: null,
          otpExpiresAt: null,
          otpUsed: true,
        },
      });
    }

    await tx.settings.update({
      where: { id: "singleton" },
      data: {
        adminPin: await hashSecret(body.adminPin!),
        isSetupComplete: true,
      },
    });
  });

  return NextResponse.json({ success: true });
}

function validateSetupBody(body: SetupBody) {
  const errors: Record<string, string> = {};
  if (!isValidPassword(body.superAdminPassword)) errors.superAdminPassword = "Super Admin password must be at least 8 characters.";
  if (!isValidPassword(body.adminPassword)) errors.adminPassword = "Admin password must be at least 8 characters.";
  if (!/^\d{4}$/.test(body.adminPin || "")) errors.adminPin = "Admin PIN must be exactly 4 digits.";

  for (const username of supervisorUsernames) {
    if (!isValidPassword(body.supervisorPasswords?.[username])) {
      errors[`supervisorPasswords.${username}`] = `${username} password must be at least 8 characters.`;
    }
  }

  return errors;
}

function isValidPassword(value?: string) {
  return typeof value === "string" && value.length >= 8;
}
