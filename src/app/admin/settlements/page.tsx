import { CashSettleButton } from "@/components/AdminControls";
import { SimpleTable } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { getCashSummary } from "@/lib/dashboard";
import { currency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminSettlementsPage() {
  const [cash, history] = await Promise.all([
    getCashSummary(),
    prisma.cashSettlement.findMany({
      include: { supervisor: true, settledBy: true },
      orderBy: { settledAt: "desc" },
      take: 30,
    }),
  ]);
  const pendingCash = cash.filter((row) => row.unsettledCash > 0);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Cash Settlements" description="Clear supervisor-held cash after physical verification." />
      <div className="grid gap-6 lg:grid-cols-2">
        <SimpleTable
          columns={["Supervisor", "Unsettled Cash", "Action"]}
          rows={pendingCash.map((row) => [
            row.user.displayName,
            currency(row.unsettledCash),
            <CashSettleButton supervisorId={row.user.id} />,
          ])}
        />
        <SimpleTable
          columns={["Supervisor", "Amount", "Cleared By", "When"]}
          rows={history.map((settlement) => [
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
