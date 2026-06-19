export const dynamic = "force-dynamic";

import { VerifyBookingButton } from "@/components/AdminControls";
import { SimpleTable } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { BookingStatus } from "@/lib/constants";
import { currency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminVerifyPage() {
  const bookings = await prisma.booking.findMany({
    where: { status: BookingStatus.PENDING },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageHeader eyebrow="Admin" title="Verify Entries" description="Pending supervisor bookings waiting for confirmation." />
      <SimpleTable
        columns={["Date", "Time", "Turf", "Customer", "Amount", "Staff", "Action"]}
        rows={bookings.map((booking) => [
          booking.businessDate.toISOString().slice(0, 10),
          booking.timeSlot,
          `Turf ${booking.turfNumber}`,
          booking.customerName,
          currency(booking.totalAmount),
          booking.staffName,
          <VerifyBookingButton bookingId={booking.id} />,
        ])}
      />
    </>
  );
}
