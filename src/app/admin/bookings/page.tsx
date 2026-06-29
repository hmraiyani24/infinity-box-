export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { PageHeader } from "@/components/DashboardShell";
import { authOptions } from "@/lib/auth";

export default async function AdminBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <>
      <PageHeader eyebrow="Admin" title="All Bookings" description="Search-ready operational register for active bookings." />
      <BookingsTable role="ADMIN" userId={session.user.id} />
    </>
  );
}
