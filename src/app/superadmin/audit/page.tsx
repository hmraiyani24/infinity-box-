export const dynamic = "force-dynamic";

import { SimpleTable } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { prisma } from "@/lib/prisma";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({ include: { user: true }, orderBy: { timestamp: "desc" }, take: 100 });

  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Audit Log" description="Timeline of sensitive operational changes." />
      <SimpleTable
        columns={["Time", "Actor", "Action", "Details"]}
        rows={logs.map((log) => [
          log.timestamp.toLocaleString("en-IN"),
          log.user.displayName,
          log.action,
          log.after || log.before || "—",
        ])}
      />
    </>
  );
}
