export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookingsTable } from "@/components/bookings/BookingsTable";
import { PageHeader } from "@/components/DashboardShell";
import { EditRequestForm } from "@/components/EditRequestForm";
import { authOptions } from "@/lib/auth";
import { BookingStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function MyBookingsPage({ searchParams }: { searchParams: { edit?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [editBooking] = await Promise.all([
    searchParams.edit
      ? prisma.booking.findFirst({ where: { id: searchParams.edit, createdById: session.user.id, status: { not: BookingStatus.DELETED } } })
      : null,
  ]);

  return (
    <>
      <PageHeader eyebrow="Supervisor" title="My Bookings" description="Review your bookings and request changes that need admin approval." />
      {editBooking ? <EditRequestForm booking={editBooking} /> : null}
      <BookingsTable role="SUPERVISOR" userId={session.user.id} />
    </>
  );
}
