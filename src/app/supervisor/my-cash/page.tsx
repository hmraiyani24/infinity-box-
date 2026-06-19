export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SimpleTable, StatGrid } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { authOptions } from "@/lib/auth";
import { currency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function MyCashPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [entries, settlements] = await Promise.all([
    prisma.cashLedger.findMany({
      where: { supervisorId: session.user.id, isSettled: false },
      include: { booking: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cashSettlement.findMany({
      where: { supervisorId: session.user.id },
      include: { settledBy: true },
      orderBy: { settledAt: "desc" },
      take: 20,
    }),
  ]);
  const total = entries.reduce((sum, entry) => sum + entry.cashAmount, 0);

  return (
    <>
      <PageHeader eyebrow="Supervisor" title="My Cash" description="Cash currently held by you and past clearances verified by Admin." />
      <StatGrid stats={[{ label: "Current Cash Holding", value: currency(total), hint: `${entries.length} unsettled entries` }]} />
      <div className="mt-8 space-y-8">
        <SimpleTable
          columns={["Date", "Customer", "Amount", "Booking"]}
          rows={entries.map((entry) => [
            entry.businessDate.toISOString().slice(0, 10),
            entry.booking.customerName,
            currency(entry.cashAmount),
            entry.booking.timeSlot,
          ])}
        />
        <SimpleTable
          columns={["Settled At", "Amount", "Admin", "Notes"]}
          rows={settlements.map((settlement) => [
            settlement.settledAt.toLocaleDateString("en-IN"),
            currency(settlement.totalAmount),
            settlement.settledBy.displayName,
            settlement.notes || "—",
          ])}
        />
      </div>
    </>
  );
}
