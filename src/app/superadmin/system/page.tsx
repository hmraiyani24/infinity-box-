import { PageHeader } from "@/components/DashboardShell";
import { Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { SystemPanel } from "./SystemPanel";

export default async function SuperAdminSystemPage() {
  const users = await prisma.user.findMany({
    where: {
      username: { in: ["superadmin", "admin", "rakesh", "hiren", "nikunj", "hardik"] },
      role: { in: [Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR] },
    },
    orderBy: [{ role: "desc" }, { username: "asc" }],
    select: { id: true, username: true, displayName: true, role: true },
  });

  const orderedUsers = ["superadmin", "admin", "rakesh", "hiren", "nikunj", "hardik"]
    .map((username) => users.find((user) => user.username === username))
    .filter(Boolean) as typeof users;

  return (
    <>
      <PageHeader
        eyebrow="Super Admin"
        title="System"
        description="Change passwords, update the admin PIN, and manage database backups from the browser."
      />
      <SystemPanel users={orderedUsers} />
    </>
  );
}
