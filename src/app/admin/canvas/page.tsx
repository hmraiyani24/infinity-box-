export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DailyCanvas } from "@/components/DailyCanvas";
import { PageHeader } from "@/components/DashboardShell";
import { authOptions } from "@/lib/auth";
import { parseBusinessDate } from "@/lib/businessDate";
import { getCanvasData } from "@/lib/dashboard";

export default async function AdminCanvasPage({ searchParams }: { searchParams: { date?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const businessDate = parseBusinessDate(searchParams.date);
  const data = await getCanvasData(businessDate);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Daily Canvas" description="Verify entries, delete with PIN, clear cash, and review supervisor edit requests." />
      <DailyCanvas role="ADMIN" userId={session.user.id} businessDate={businessDate.toISOString().slice(0, 10)} {...serializeCanvasData(data)} />
    </>
  );
}

function serializeCanvasData(data: Awaited<ReturnType<typeof getCanvasData>>) {
  return {
    ...data,
    bookings: data.bookings.map((booking) => ({
      ...booking,
      businessDate: booking.businessDate.toISOString().slice(0, 10),
      createdAt: booking.createdAt.toISOString(),
      verifiedAt: booking.verifiedAt?.toISOString() ?? null,
      lastEditedAt: booking.lastEditedAt?.toISOString() ?? null,
    })),
  };
}
