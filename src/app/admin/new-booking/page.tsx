import { BookingForm } from "@/components/BookingForm";
import { PageHeader } from "@/components/DashboardShell";
import { formatBusinessDate, getBusinessDate } from "@/lib/businessDate";

export default function AdminNewBookingPage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="New Booking" description="Admin-created bookings are confirmed immediately." />
      <BookingForm defaultDate={formatBusinessDate(getBusinessDate(new Date()))} />
    </>
  );
}
