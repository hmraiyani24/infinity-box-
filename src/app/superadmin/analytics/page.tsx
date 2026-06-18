import { format, subMonths } from "date-fns";
import { RevenueBarChart } from "@/components/analytics/RevenueBarChart";
import { SlotHeatmap } from "@/components/analytics/SlotHeatmap";
import { TurfUtilizationChart } from "@/components/analytics/TurfUtilizationChart";
import { SimpleTable, StatGrid } from "@/components/DataViews";
import { PageHeader } from "@/components/DashboardShell";
import { getAnalytics, getTopClients } from "@/lib/dashboard";
import { TIME_SLOTS, TURF_COLORS } from "@/lib/constants";
import { currency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AnalyticsPage() {
  const selectedDate = new Date("2026-06-01");
  const [analytics, clients, revenueStats, heatmapData, turfData] = await Promise.all([
    getAnalytics("month", selectedDate),
    getTopClients(),
    getRevenueStats(12),
    getHeatmapData(6, 2026),
    getTurfUtilization(6, 2026),
  ]);

  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Analytics" description="Revenue, payment split, top customers, and utilization insights." />

      <section className="space-y-6">
        <h2 className="text-xl font-black text-white">Balance Sheet</h2>
        <StatGrid
          stats={[
            { label: "Revenue", value: currency(analytics.paymentTotals.total), hint: "June 2026" },
            { label: "Cash", value: currency(analytics.paymentTotals.CASH) },
            { label: "DK Bank", value: currency(analytics.paymentTotals.DK_BANK) },
            { label: "HG Bank", value: currency(analytics.paymentTotals.HG_BANK) },
          ]}
        />
      </section>

      <section className="mt-10 space-y-6">
        <h2 className="text-xl font-black text-white">Revenue Stats</h2>
        <StatGrid
          stats={[
            { label: "Best Day Ever", value: currency(revenueStats.bestDay.amount), hint: `on ${revenueStats.bestDay.date}` },
            { label: "Best Month Ever", value: currency(revenueStats.bestMonth.amount), hint: `in ${revenueStats.bestMonth.label}` },
          ]}
        />
        <div className="glass-panel rounded-[2rem] p-5">
          <RevenueBarChart data={revenueStats.monthlyTrend} />
        </div>
        <div className="glass-panel rounded-[2rem] p-5">
          <h3 className="mb-4 text-lg font-black text-white">Turf Utilization</h3>
          <TurfUtilizationChart data={turfData} />
        </div>
      </section>

      <section className="mt-10 space-y-6">
        <div>
          <h2 className="text-xl font-black text-white">Slot Demand Heatmap</h2>
          <p className="mt-1 text-sm text-zinc-500">Month: June · Year: 2026</p>
        </div>
        <SlotHeatmap data={heatmapData} />
      </section>

      <div className="mt-10">
        <h2 className="mb-4 text-xl font-black text-white">Top Clients</h2>
        <SimpleTable
          columns={["Rank", "Client", "Phone", "Total Spent", "Visits", "Last Visit"]}
          rows={clients.map((client, index) => [
            index + 1,
            client.name,
            client.phone,
            currency(client.totalSpent),
            client.visitCount,
            client.lastVisit.toISOString().slice(0, 10),
          ])}
        />
      </div>
    </>
  );
}

async function getRevenueStats(months: number) {
  const since = subMonths(new Date(), months);
  const bookings = await prisma.booking.findMany({
    where: { status: { not: "DELETED" }, businessDate: { gte: since } },
    select: { businessDate: true, totalAmount: true, paymentMode: true },
    orderBy: { businessDate: "asc" },
  });

  const byMonth: Record<string, { total: number; cash: number; dkBank: number; hgBank: number }> = {};
  for (const booking of bookings) {
    const key = format(booking.businessDate, "MMM yy");
    byMonth[key] ??= { total: 0, cash: 0, dkBank: 0, hgBank: 0 };
    byMonth[key].total += booking.totalAmount;
    if (booking.paymentMode === "CASH") byMonth[key].cash += booking.totalAmount;
    if (booking.paymentMode === "DK_BANK") byMonth[key].dkBank += booking.totalAmount;
    if (booking.paymentMode === "HG_BANK") byMonth[key].hgBank += booking.totalAmount;
  }

  const allBookings = await prisma.booking.findMany({
    where: { status: { not: "DELETED" } },
    select: { businessDate: true, totalAmount: true },
  });
  const byDay: Record<string, number> = {};
  const byMonthKey: Record<string, number> = {};
  for (const booking of allBookings) {
    const dayKey = booking.businessDate.toISOString().slice(0, 10);
    const monthKey = booking.businessDate.toISOString().slice(0, 7);
    byDay[dayKey] = (byDay[dayKey] ?? 0) + booking.totalAmount;
    byMonthKey[monthKey] = (byMonthKey[monthKey] ?? 0) + booking.totalAmount;
  }
  const bestDayKey = Object.keys(byDay).sort((a, b) => byDay[b] - byDay[a])[0];
  const bestMonthKey = Object.keys(byMonthKey).sort((a, b) => byMonthKey[b] - byMonthKey[a])[0];

  return {
    monthlyTrend: Object.entries(byMonth).map(([month, value]) => ({ month, ...value })),
    bestDay: { date: bestDayKey ?? "—", amount: bestDayKey ? byDay[bestDayKey] : 0 },
    bestMonth: {
      label: bestMonthKey ? format(new Date(`${bestMonthKey}-01`), "MMMM yyyy") : "—",
      amount: bestMonthKey ? byMonthKey[bestMonthKey] : 0,
    },
  };
}

async function getHeatmapData(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const bookings = await prisma.booking.findMany({
    where: { businessDate: { gte: start, lte: end }, status: { not: "DELETED" } },
    select: { timeSlot: true, businessDate: true },
  });
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const result: Record<string, Record<string, number>> = {};
  for (const slot of TIME_SLOTS) {
    result[slot] = Object.fromEntries(days.map((day) => [day, 0]));
  }
  for (const booking of bookings) {
    const dayKey = days[(booking.businessDate.getDay() + 6) % 7];
    result[booking.timeSlot][dayKey] += 1;
  }
  return result;
}

async function getTurfUtilization(month: number, year: number) {
  const bookings = await prisma.booking.findMany({
    where: {
      businessDate: { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59) },
      status: { not: "DELETED" },
    },
    select: { turfNumber: true, totalAmount: true },
  });
  const total = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

  return [1, 2, 3, 4].map((turfNumber) => {
    const turfBookings = bookings.filter((booking) => booking.turfNumber === turfNumber);
    const revenue = turfBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
    return {
      turf: `Turf ${turfNumber}`,
      bookings: turfBookings.length,
      revenue,
      pct: total ? (revenue / total) * 100 : 0,
      color: TURF_COLORS[turfNumber].dot,
    };
  });
}
