export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Role, TIME_SLOTS } from "@/lib/constants";
import { hashSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";

type SetupBody = {
  adminPin?: string;
  accountPasswords?: Record<string, string>;
};

const setupUsers = [
  { username: "hiren", role: Role.SUPER_ADMIN, displayName: "Hiren" },
  { username: "nikunj", role: Role.SUPER_ADMIN, displayName: "Nikunj" },
  { username: "dk", role: Role.ADMIN, displayName: "DK" },
  { username: "hardik", role: Role.ADMIN, displayName: "Hardik" },
  { username: "rakesh", role: Role.SUPERVISOR, displayName: "Rakesh" },
  { username: "supervisor2", role: Role.SUPERVISOR, displayName: "Supervisor 2" },
  { username: "nitin", role: Role.VIEWER, displayName: "Nitin" },
  { username: "viewer2", role: Role.VIEWER, displayName: "Viewer 2" },
];

const accountUsernames = setupUsers.map((user) => user.username);

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    return NextResponse.json({ isSetupComplete: Boolean(settings?.isSetupComplete) });
  } catch (error) {
    console.error("Setup status check failed", error);
    return NextResponse.json({ isSetupComplete: false, error: setupErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        adminPin: "",
        turfs: JSON.stringify(["Turf 1", "Turf 2", "Turf 3", "Turf 4"]),
        timeSlots: JSON.stringify(TIME_SLOTS),
        paymentModes: JSON.stringify(["CASH", "DK_BANK", "HG_BANK"]),
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
      for (const user of setupUsers) {
        const passwordHash = await hashSecret(body.accountPasswords![user.username]);
        await tx.user.upsert({
          where: { username: user.username },
          create: {
            username: user.username,
            role: user.role,
            displayName: user.displayName,
            passwordHash,
            isFirstLogin: false,
            otpUsed: true,
          },
          update: {
            passwordHash,
            role: user.role,
            displayName: user.displayName,
            isFirstLogin: false,
            otpHash: null,
            otpExpiresAt: null,
            otpUsed: true,
            isActive: true,
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
  } catch (error) {
    console.error("Setup activation failed", error);
    return NextResponse.json({ error: setupErrorMessage(error) }, { status: 500 });
  }
}

function validateSetupBody(body: SetupBody) {
  const errors: Record<string, string> = {};
  if (!/^\d{4}$/.test(body.adminPin || "")) errors.adminPin = "Admin PIN must be exactly 4 digits.";

  for (const username of accountUsernames) {
    if (!isValidPassword(body.accountPasswords?.[username])) {
      errors[`accountPasswords.${username}`] = `${username} password must be at least 8 characters.`;
    }
  }

  return errors;
}

function isValidPassword(value?: string) {
  return typeof value === "string" && value.length >= 8;
}

function setupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Environment variable not found: DATABASE_URL")) {
    return "DATABASE_URL is missing in Vercel Environment Variables.";
  }
  if (message.includes("URL must start with the protocol")) {
    return "DATABASE_URL must be a PostgreSQL connection string in Vercel, starting with postgresql:// or postgres://.";
  }
  if (message.includes("no such table")) {
    return "Database tables are missing. Run Prisma migrations or db push for the production database.";
  }
  return "Unable to complete setup. Check the Vercel function logs for details.";
}
