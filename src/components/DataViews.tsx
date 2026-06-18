import Link from "next/link";
import { currency, titlePaymentMode } from "@/lib/format";

type Booking = {
  id: string;
  businessDate: Date;
  turfNumber: number;
  timeSlot: string;
  customerName: string;
  phone: string;
  totalAmount: number;
  advanceAmount: number;
  paymentMode: string;
  staffName: string;
  status: string;
  createdAt: Date;
  editRequests?: { id: string }[];
};

export function BookingTable({ bookings, basePath }: { bookings: Booking[]; basePath?: string }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--infinity-surface)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-black/30 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-4">Date</th>
              <th className="px-4 py-4">Time</th>
              <th className="px-4 py-4">Turf</th>
              <th className="px-4 py-4">Customer</th>
              <th className="px-4 py-4">Amount</th>
              <th className="px-4 py-4">Payment</th>
              <th className="px-4 py-4">Staff</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {bookings.map((booking) => (
              <tr key={booking.id} className="text-zinc-300">
                <td className="px-4 py-4">{booking.businessDate.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-4">{booking.timeSlot}</td>
                <td className="px-4 py-4">Turf {booking.turfNumber}</td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-white">{booking.customerName}</p>
                  <p className="font-mono text-xs text-zinc-500">{booking.phone}</p>
                </td>
                <td className="px-4 py-4">{currency(booking.totalAmount)}</td>
                <td className="px-4 py-4">{titlePaymentMode(booking.paymentMode)}</td>
                <td className="px-4 py-4">{booking.staffName}</td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs">{booking.status}</span>
                  {booking.editRequests?.length ? <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-1 text-xs text-amber-200">Edit Pending</span> : null}
                </td>
                <td className="px-4 py-4">
                  {basePath ? <Link href={`${basePath}?edit=${booking.id}`} className="text-[var(--infinity-lime)]">Open</Link> : "—"}
                </td>
              </tr>
            ))}
            {!bookings.length ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">No records found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatGrid({ stats }: { stats: Array<{ label: string; value: string; hint?: string }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-panel rounded-[1.5rem] p-5">
          <p className="text-sm text-zinc-500">{stat.label}</p>
          <p className="mt-2 text-2xl font-black text-white">{stat.value}</p>
          {stat.hint ? <p className="mt-1 text-xs text-zinc-500">{stat.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function SimpleTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--infinity-surface)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-black/30 text-xs uppercase tracking-wider text-zinc-500">
            <tr>{columns.map((column) => <th key={column} className="px-4 py-4">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row, index) => (
              <tr key={index} className="text-zinc-300">
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-4">{cell}</td>)}
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-zinc-500">No records found.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
