import { SimpleTable } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { getCashSummary } from "@/lib/dashboard";
import { currency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CashOverviewPage() {
  const [cash, settlements] = await Promise.all([
    getCashSummary(),
    prisma.cashSettlement.findMany({ include: { supervisor: true, settledBy: true }, orderBy: { settledAt: "desc" }, take: 50 }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Cash Overview" description="Live supervisor cash balances and settlement history." />
      <div className="space-y-8">
        <SimpleTable
          columns={["Supervisor", "Unsettled Cash", "Status"]}
          rows={cash.map((row) => [row.user.displayName, currency(row.unsettledCash), row.unsettledCash > 0 ? "Pending" : "Clear"])}
        />
        <SimpleTable
          columns={["Supervisor", "Amount", "Cleared By", "Settled At"]}
          rows={settlements.map((settlement) => [
            settlement.supervisor.displayName,
            currency(settlement.totalAmount),
            settlement.settledBy.displayName,
            settlement.settledAt.toLocaleString("en-IN"),
          ])}
        />
      </div>
    </>
  );
}
