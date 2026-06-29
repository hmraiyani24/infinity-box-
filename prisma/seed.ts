import crypto from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { BookingStatus, PaymentMode, REFERENCE_NAMES, Role, TIME_SLOTS } from "../src/lib/constants";
import { bookingSnapshot } from "../src/lib/server";
import { hashSecret } from "../src/lib/otp";

const seedUsers = [
  { username: "hiren", displayName: "Hiren", role: Role.SUPER_ADMIN },
  { username: "nikunj", displayName: "Nikunj", role: Role.SUPER_ADMIN },
  { username: "dk", displayName: "DK", role: Role.ADMIN },
  { username: "hardik", displayName: "Hardik", role: Role.ADMIN },
  { username: "rakesh", displayName: "Rakesh", role: Role.SUPERVISOR },
  { username: "supervisor2", displayName: "Supervisor 2", role: Role.SUPERVISOR },
  { username: "nitin", displayName: "Nitin", role: Role.VIEWER },
  { username: "viewer2", displayName: "Viewer 2", role: Role.VIEWER },
];

const names = [
  "Arvind Bhai",
  "Sujal",
  "Latif",
  "Varun",
  "Milan",
  "Dhruval",
  "Sachin",
  "Jay Patel",
  "Mehul",
  "Krunal",
  "Yash",
  "Bhavin",
  "Nirav",
  "Paresh",
  "Keval",
  "Vishal",
];

async function main() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.bookingEditRequest.deleteMany(),
    prisma.cashLedger.deleteMany(),
    prisma.cashSettlement.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.settings.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const adminPin = await hashSecret("4321");

  const users = await Promise.all(
    seedUsers.map((person) =>
      prisma.user.create({
        data: {
          username: person.username,
          passwordHash: bcrypt.hashSync(`${person.username}@123`, 12),
          role: person.role,
          displayName: person.displayName,
          isFirstLogin: true,
          otpHash: null,
          otpUsed: false,
        },
      }),
    ),
  );
  const superadmin = users.find((user) => user.role === Role.SUPER_ADMIN)!;
  const admin = users.find((user) => user.role === Role.ADMIN)!;

  await prisma.settings.create({
    data: {
      adminPin,
      turfs: JSON.stringify(["Turf 1", "Turf 2", "Turf 3", "Turf 4"]),
      timeSlots: JSON.stringify(TIME_SLOTS),
      paymentModes: JSON.stringify(["CASH", "DK_BANK", "HG_BANK"]),
      isSetupComplete: false,
    },
  });

  const fixedSupervisorUsers = await prisma.user.findMany({ where: { role: Role.SUPERVISOR }, orderBy: { username: "asc" } });
  const bookings = [];

  for (let index = 0; index < 30; index += 1) {
    const supervisor = fixedSupervisorUsers[index % fixedSupervisorUsers.length];
    const businessDate = new Date(Date.UTC(2026, 5, 1 + (index % 18)));
    const paymentMode = [PaymentMode.CASH, PaymentMode.DK_BANK, PaymentMode.HG_BANK, PaymentMode.SPLIT][index % 4];
    const totalAmount = 1000 + ((index * 275) % 3800);
    const advanceAmount = Math.min(totalAmount, 500 + ((index * 125) % 1500));
    const cashAmount = paymentMode === PaymentMode.CASH ? advanceAmount : paymentMode === PaymentMode.SPLIT ? Math.min(advanceAmount, 500) : 0;

    const booking = await prisma.booking.create({
      data: {
        businessDate,
        turfNumber: (index % 4) + 1,
        timeSlot: TIME_SLOTS[index % TIME_SLOTS.length],
        timeOverride: index % 7 === 0 ? "6:30 to 8:30" : null,
        customerName: names[index % names.length],
        phone: `98765${String(10000 + index).slice(1)}`,
        totalAmount,
        advanceAmount,
        advancePaymentMode: paymentMode,
        cashPortion: paymentMode === PaymentMode.SPLIT ? Math.min(advanceAmount, 500) : paymentMode === PaymentMode.CASH ? advanceAmount : null,
        cashAmount,
        referenceName: REFERENCE_NAMES[index % REFERENCE_NAMES.length],
        staffName: supervisor.displayName,
        notes: index % 5 === 0 ? "Ball and lights included" : null,
        status: index < 20 ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
        createdById: supervisor.id,
        verifiedById: index < 20 ? admin.id : null,
        verifiedAt: index < 20 ? new Date() : null,
      },
    });

    if (cashAmount > 0) {
      await prisma.cashLedger.create({
        data: {
          supervisorId: supervisor.id,
          bookingId: booking.id,
          cashAmount,
          businessDate,
        },
      });
    }

    bookings.push(booking);
  }

  const ledgers = await prisma.cashLedger.findMany({
    where: { supervisorId: { in: [fixedSupervisorUsers[0].id, fixedSupervisorUsers[2].id] } },
    take: 4,
  });

  for (const supervisor of [fixedSupervisorUsers[0], fixedSupervisorUsers[2]]) {
    const entries = ledgers.filter((entry) => entry.supervisorId === supervisor.id);
    if (!entries.length) continue;

    const settlement = await prisma.cashSettlement.create({
      data: {
        supervisorId: supervisor.id,
        settledById: admin.id,
        totalAmount: entries.reduce((total, entry) => total + entry.cashAmount, 0),
        fromDate: entries[0].businessDate,
        toDate: entries[entries.length - 1].businessDate,
        notes: "Seed settlement",
      },
    });

    await prisma.cashLedger.updateMany({
      where: { id: { in: entries.map((entry) => entry.id) } },
      data: { isSettled: true, settlementId: settlement.id },
    });
  }

  for (let index = 0; index < 3; index += 1) {
    const booking = bookings[20 + index];
    const original = bookingSnapshot(booking);
    const proposed = {
      ...original,
      totalAmount: original.totalAmount + 500,
      advancePaymentMode: index === 2 ? PaymentMode.HG_BANK : original.advancePaymentMode,
    };

    await prisma.bookingEditRequest.create({
      data: {
        bookingId: booking.id,
        requestedById: booking.createdById,
        originalData: JSON.stringify(original),
        proposedData: JSON.stringify(proposed),
        status: index === 2 ? "REJECTED" : "PENDING_APPROVAL",
        reviewedById: index === 2 ? superadmin.id : null,
        reviewedAt: index === 2 ? new Date() : null,
        rejectReason: index === 2 ? "Please confirm payment mode first." : null,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: superadmin.id,
      action: "SEED",
      after: JSON.stringify({ message: "Seeded Infinity Box demo data" }),
    },
  });

  ensureNextAuthSecret();
}

function ensureNextAuthSecret() {
  const envPath = path.resolve(".env.local");
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  if (!envContent.includes("NEXTAUTH_SECRET")) {
    const secret = crypto.randomBytes(32).toString("hex");
    fs.appendFileSync(envPath, `\nNEXTAUTH_SECRET=${secret}\n`);
    console.log("Generated NEXTAUTH_SECRET in .env.local");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
