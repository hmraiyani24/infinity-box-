import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { authOptions } from "@/lib/auth";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <DashboardShell role="SUPER_ADMIN" displayName={session.user.name || session.user.username}>
      {children}
    </DashboardShell>
  );
}
