import { BookingForm } from "@/components/BookingForm";
import { PageHeader } from "@/components/DashboardShell";
import { formatBusinessDate, getBusinessDate } from "@/lib/businessDate";

export default function SupervisorNewBookingPage() {
  return (
    <>
      <PageHeader eyebrow="Supervisor" title="New Booking" description="Create a booking for the selected business day. Supervisor entries start as pending." />
      <BookingForm defaultDate={formatBusinessDate(getBusinessDate(new Date()))} />
    </>
  );
}
