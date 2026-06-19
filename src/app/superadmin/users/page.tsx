export const dynamic = "force-dynamic";

import { RegenOtpButton, UserCreateForm } from "@/components/AdminControls";
import { SimpleTable } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { displayName: "asc" }] });

  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Users" description="Create staff accounts and manage onboarding login codes." />
      <UserCreateForm />
      <SimpleTable
        columns={["Name", "Username", "Role", "Status", "Action"]}
        rows={users.map((user) => [
          user.displayName,
          user.username,
          user.role,
          user.isFirstLogin ? "First Login Pending" : user.isActive ? "Active" : "Inactive",
          user.isFirstLogin ? <RegenOtpButton userId={user.id} /> : "—",
        ])}
      />
    </>
  );
}
