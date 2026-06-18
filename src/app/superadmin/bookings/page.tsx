import { BookingTable } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { BookingStatus, EditRequestStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function SuperAdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    where: { status: { not: BookingStatus.DELETED } },
    include: { editRequests: { where: { status: EditRequestStatus.PENDING_APPROVAL }, select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Bookings" description="Owner-level booking register. Direct edit can be extended from this surface." />
      <BookingTable bookings={bookings} />
    </>
  );
}
