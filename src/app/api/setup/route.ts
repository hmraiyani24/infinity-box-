export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Role, TIME_SLOTS } from "@/lib/constants";
import { hashSecret } from "@/lib/otp";
import { prisma } from "@/lib/prisma";

type SetupBody = {
  superAdminPassword?: string;
  adminPassword?: string;
  adminPin?: string;
  supervisorPasswords?: Record<string, string>;
};

const setupUsers = [
  { username: "superadmin", role: Role.SUPER_ADMIN, displayName: "Super Admin" },
  { username: "admin", role: Role.ADMIN, displayName: "Admin" },
  { username: "rakesh", role: Role.SUPERVISOR, displayName: "Rakesh" },
  { username: "hiren", role: Role.SUPERVISOR, displayName: "Hiren" },
  { username: "nikunj", role: Role.SUPERVISOR, displayName: "Nikunj" },
  { username: "hardik", role: Role.SUPERVISOR, displayName: "Hardik" },
];

const supervisorUsernames = setupUsers.filter((user) => user.role === Role.SUPERVISOR).map((user) => user.username);

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ isSetupComplete: Boolean(settings?.isSetupComplete) });
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
      await tx.user.upsert({
        where: { username: "superadmin" },
        create: {
          username: "superadmin",
          role: Role.SUPER_ADMIN,
          displayName: "Super Admin",
          passwordHash: await hashSecret(body.superAdminPassword!),
          isFirstLogin: false,
          otpUsed: true,
        },
        update: {
          passwordHash: await hashSecret(body.superAdminPassword!),
          role: Role.SUPER_ADMIN,
          displayName: "Super Admin",
          isFirstLogin: false,
          otpHash: null,
          otpExpiresAt: null,
          otpUsed: true,
          isActive: true,
        },
      });

      await tx.user.upsert({
        where: { username: "admin" },
        create: {
          username: "admin",
          role: Role.ADMIN,
          displayName: "Admin",
          passwordHash: await hashSecret(body.adminPassword!),
          isFirstLogin: false,
          otpUsed: true,
        },
        update: {
          passwordHash: await hashSecret(body.adminPassword!),
          role: Role.ADMIN,
          displayName: "Admin",
          isFirstLogin: false,
          otpHash: null,
          otpExpiresAt: null,
          otpUsed: true,
          isActive: true,
        },
      });

      for (const user of setupUsers.filter((item) => item.role === Role.SUPERVISOR)) {
        await tx.user.upsert({
          where: { username: user.username },
          create: {
            username: user.username,
            role: user.role,
            displayName: user.displayName,
            passwordHash: await hashSecret(body.supervisorPasswords![user.username]),
            isFirstLogin: false,
            otpUsed: true,
          },
          update: {
            passwordHash: await hashSecret(body.supervisorPasswords![user.username]),
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

function setupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Environment variable not found: DATABASE_URL")) {
    return "DATABASE_URL is missing in Vercel Environment Variables.";
  }
  if (message.includes("no such table")) {
    return "Database tables are missing. Run Prisma migrations or db push for the production database.";
  }
  return "Unable to complete setup. Check the Vercel function logs for details.";
}
