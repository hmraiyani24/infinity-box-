import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { BookingStatus, PaymentMode, Role, TIME_SLOTS } from "../src/lib/constants";
import { bookingSnapshot } from "../src/lib/server";
import { hashSecret } from "../src/lib/otp";

const supervisors = [
  { username: "rakesh", displayName: "Rakesh" },
  { username: "hiren", displayName: "Hiren" },
  { username: "nikunj", displayName: "Nikunj" },
  { username: "hardik", displayName: "Hardik" },
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

  const passwordHash = await hashSecret("super@123");
  const adminPasswordHash = await hashSecret("admin@123");
  const adminPin = await hashSecret("4321");

  const superadmin = await prisma.user.create({
    data: {
      username: "superadmin",
      passwordHash,
      role: Role.SUPER_ADMIN,
      displayName: "Super Admin",
      isFirstLogin: false,
      otpUsed: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      displayName: "Admin",
      isFirstLogin: false,
      otpUsed: true,
    },
  });

  const supervisorUsers = await Promise.all(
    supervisors.map(async (person) =>
      prisma.user.create({
        data: {
          username: person.username,
          passwordHash: await hashSecret(`${person.username}@123`),
          role: Role.SUPERVISOR,
          displayName: person.displayName,
          isFirstLogin: false,
          otpUsed: true,
        },
      }),
    ),
  );

  await prisma.settings.create({
    data: {
      adminPin,
      turfs: JSON.stringify(["Turf 1", "Turf 2", "Turf 3", "Turf 4"]),
      timeSlots: JSON.stringify(TIME_SLOTS),
      paymentModes: JSON.stringify(["CASH", "DK_BANK", "HG_BANK", "SPLIT"]),
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
        paymentMode,
        cashAmount,
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
      paymentMode: index === 2 ? PaymentMode.HG_BANK : original.paymentMode,
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
