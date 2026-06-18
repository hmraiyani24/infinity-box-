import { BookingForm } from "@/components/BookingForm";
import { PageHeader } from "@/components/DashboardShell";
import { formatBusinessDate, getBusinessDate } from "@/lib/businessDate";

export default function SuperAdminNewBookingPage() {
  return (
    <>
      <PageHeader eyebrow="Super Admin" title="New Booking" description="Create a confirmed booking from the owner dashboard." />
      <BookingForm defaultDate={formatBusinessDate(getBusinessDate(new Date()))} />
    </>
  );
}
