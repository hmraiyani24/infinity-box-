import { BookingTable } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { BookingStatus, EditRequestStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: BookingStatus.DELETED } },
    include: { editRequests: { where: { status: EditRequestStatus.PENDING_APPROVAL }, select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader eyebrow="Admin" title="All Bookings" description="Search-ready operational register for active bookings." />
      <BookingTable bookings={bookings} />
    </>
  );
}
