"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { PAYMENT_MODES, TIME_SLOTS, TURFS } from "@/lib/constants";
import { titlePaymentMode } from "@/lib/format";

export function BookingForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const paymentMode = String(form.get("paymentMode"));
    const advanceAmount = Number(form.get("advanceAmount") || 0);
    const body = {
      businessDate: String(form.get("businessDate")),
      turfNumber: Number(form.get("turfNumber")),
      timeSlot: String(form.get("timeSlot")),
      timeOverride: String(form.get("timeOverride") || ""),
      customerName: String(form.get("customerName")),
      phone: String(form.get("phone")),
      totalAmount: Number(form.get("totalAmount")),
      advanceAmount,
      paymentMode,
      cashAmount: paymentMode === "CASH" ? advanceAmount : Number(form.get("cashAmount") || 0),
      notes: String(form.get("notes") || ""),
    };

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unable to save booking" }));
      toast.error(error.error || "Unable to save booking");
      return;
    }

    toast.success("Booking saved! Pending admin confirmation.");
    router.back();
    router.refresh();
  }

  const inputClass = "focus-ring w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white";
  const labelClass = "mb-2 block text-sm font-medium text-zinc-300";

  return (
    <form onSubmit={onSubmit} className="glass-panel grid gap-5 rounded-[2rem] p-6 md:grid-cols-2">
      <label>
        <span className={labelClass}>Business Date</span>
        <input name="businessDate" type="date" defaultValue={params.get("date") || defaultDate} required className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Turf</span>
        <select name="turfNumber" defaultValue={params.get("turf") || "1"} className={inputClass}>
          {TURFS.map((turf) => <option key={turf.number} value={turf.number}>{turf.name}</option>)}
        </select>
      </label>
      <label>
        <span className={labelClass}>Time Slot</span>
        <select name="timeSlot" defaultValue={params.get("slot") || TIME_SLOTS[0]} className={inputClass}>
          {TIME_SLOTS.map((slot) => <option key={slot}>{slot}</option>)}
        </select>
      </label>
      <label>
        <span className={labelClass}>Time Override</span>
        <input name="timeOverride" placeholder="6:30 to 8:30" className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Customer Name</span>
        <input name="customerName" required className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Phone</span>
        <input name="phone" required inputMode="tel" className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Total Amount</span>
        <input name="totalAmount" required min={1} type="number" className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Advance Amount</span>
        <input name="advanceAmount" min={0} type="number" defaultValue={0} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Payment Mode</span>
        <select name="paymentMode" className={inputClass}>
          {PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{titlePaymentMode(mode)}</option>)}
        </select>
      </label>
      <label>
        <span className={labelClass}>Cash Component</span>
        <input name="cashAmount" min={0} type="number" defaultValue={0} className={inputClass} />
      </label>
      <label className="md:col-span-2">
        <span className={labelClass}>Notes</span>
        <textarea name="notes" rows={3} className={inputClass} />
      </label>
      <div className="flex gap-3 md:col-span-2">
        <button disabled={loading} className="rounded-2xl bg-[var(--infinity-lime)] px-6 py-3 font-bold text-black disabled:opacity-60">
          {loading ? "Saving..." : "Save Booking"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-2xl border border-white/10 px-6 py-3 text-zinc-300">
          Cancel
        </button>
      </div>
    </form>
  );
}
