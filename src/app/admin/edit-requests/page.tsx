export const dynamic = "force-dynamic";

import { EditRequestControls } from "@/components/AdminControls";
import { SimpleTable } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { EditRequestStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function AdminEditRequestsPage() {
  const requests = await prisma.bookingEditRequest.findMany({
    where: { status: EditRequestStatus.PENDING_APPROVAL },
    include: { booking: true, requestedBy: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageHeader eyebrow="Admin" title="Edit Requests" description="Review supervisor-proposed booking changes before they go live." />
      <SimpleTable
        columns={["Booking", "Requested By", "Current", "Proposed", "Requested", "Action"]}
        rows={requests.map((request) => {
          const original = JSON.parse(request.originalData);
          const proposed = JSON.parse(request.proposedData);
          return [
            request.booking.customerName,
            request.requestedBy.displayName,
            `${original.totalAmount} · ${original.advancePaymentMode ?? original.paymentMode} · Turf ${original.turfNumber}`,
            <span className="text-amber-200">{`${proposed.totalAmount} · ${proposed.advancePaymentMode ?? proposed.paymentMode} · Turf ${proposed.turfNumber}`}</span>,
            request.createdAt.toLocaleString("en-IN"),
            <EditRequestControls id={request.id} />,
          ];
        })}
      />
    </>
  );
}
