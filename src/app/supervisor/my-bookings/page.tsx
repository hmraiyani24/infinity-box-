import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookingTable } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { EditRequestForm } from "@/components/EditRequestForm";
import { authOptions } from "@/lib/auth";
import { BookingStatus, EditRequestStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function MyBookingsPage({ searchParams }: { searchParams: { edit?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [bookings, editBooking] = await Promise.all([
    prisma.booking.findMany({
      where: { createdById: session.user.id, status: { not: BookingStatus.DELETED } },
      include: { editRequests: { where: { status: EditRequestStatus.PENDING_APPROVAL }, select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    searchParams.edit
      ? prisma.booking.findFirst({ where: { id: searchParams.edit, createdById: session.user.id, status: { not: BookingStatus.DELETED } } })
      : null,
  ]);

  return (
    <>
      <PageHeader eyebrow="Supervisor" title="My Bookings" description="Review your bookings and request changes that need admin approval." />
      {editBooking ? <EditRequestForm booking={editBooking} /> : null}
      <BookingTable bookings={bookings} basePath="/supervisor/my-bookings" />
    </>
  );
}
