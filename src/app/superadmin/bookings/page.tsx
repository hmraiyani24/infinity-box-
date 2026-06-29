export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { PageHeader } from "@/components/DashboardShell";
import { authOptions } from "@/lib/auth";

export default async function SuperAdminBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Bookings" description="Owner-level booking register. Direct edit can be extended from this surface." />
      <BookingsTable role="SUPER_ADMIN" userId={session.user.id} />
    </>
  );
}
