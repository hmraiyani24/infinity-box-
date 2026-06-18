"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PAYMENT_MODES, TIME_SLOTS, TURFS } from "@/lib/constants";

type Booking = {
  id: string;
  businessDate: Date;
  turfNumber: number;
  timeSlot: string;
  timeOverride: string | null;
  customerName: string;
  phone: string;
  totalAmount: number;
  advanceAmount: number;
  paymentMode: string;
  cashAmount: number;
  notes: string | null;
};

export function EditRequestForm({ booking }: { booking: Booking }) {
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/edit-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: booking.id,
        businessDate: String(form.get("businessDate")),
        turfNumber: Number(form.get("turfNumber")),
        timeSlot: String(form.get("timeSlot")),
        timeOverride: String(form.get("timeOverride") || ""),
        customerName: String(form.get("customerName")),
        phone: String(form.get("phone")),
        totalAmount: Number(form.get("totalAmount")),
        advanceAmount: Number(form.get("advanceAmount")),
        paymentMode: String(form.get("paymentMode")),
        cashAmount: Number(form.get("cashAmount") || 0),
        notes: String(form.get("notes") || ""),
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(body.error || "Unable to send edit request");
    toast.success("Edit request sent for approval");
    router.push("/supervisor/my-bookings");
    router.refresh();
  }

  const input = "w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white";

  return (
    <form onSubmit={onSubmit} className="glass-panel mb-8 grid gap-4 rounded-[2rem] p-5 md:grid-cols-2">
      <h2 className="text-xl font-black text-white md:col-span-2">Request Edit</h2>
      <input name="businessDate" type="date" defaultValue={booking.businessDate.toISOString().slice(0, 10)} className={input} />
      <select name="turfNumber" defaultValue={booking.turfNumber} className={input}>{TURFS.map((turf) => <option key={turf.number} value={turf.number}>{turf.name}</option>)}</select>
      <select name="timeSlot" defaultValue={booking.timeSlot} className={input}>{TIME_SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select>
      <input name="timeOverride" defaultValue={booking.timeOverride || ""} placeholder="Time override" className={input} />
      <input name="customerName" defaultValue={booking.customerName} className={input} />
      <input name="phone" defaultValue={booking.phone} className={input} />
      <input name="totalAmount" type="number" defaultValue={booking.totalAmount} className={input} />
      <input name="advanceAmount" type="number" defaultValue={booking.advanceAmount} className={input} />
      <select name="paymentMode" defaultValue={booking.paymentMode} className={input}>{PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select>
      <input name="cashAmount" type="number" defaultValue={booking.cashAmount} className={input} />
      <textarea name="notes" defaultValue={booking.notes || ""} className={`${input} md:col-span-2`} />
      <button className="rounded-2xl bg-[var(--infinity-lime)] px-5 py-3 font-bold text-black">Send for Approval</button>
    </form>
  );
}
