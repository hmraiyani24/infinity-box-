import { SimpleTable } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const turfs = settings ? JSON.parse(settings.turfs) as string[] : [];
  const slots = settings ? JSON.parse(settings.timeSlots) as string[] : [];
  const paymentModes = settings ? JSON.parse(settings.paymentModes) as string[] : [];

  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Settings" description="Current operational configuration for turfs, slots, payment modes, and admin PIN." />
      <div className="grid gap-6 lg:grid-cols-3">
        <SimpleTable columns={["Turfs"]} rows={turfs.map((item) => [item])} />
        <SimpleTable columns={["Payment Modes"]} rows={paymentModes.map((item) => [item])} />
        <SimpleTable columns={["Time Slots"]} rows={slots.map((item) => [item])} />
      </div>
    </>
  );
}
