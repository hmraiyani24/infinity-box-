"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { PAYMENT_MODES, REFERENCE_NAMES, TIME_SLOTS, TURFS, slotToTimeRange, timeRangeToSlot } from "@/lib/constants";
import { titlePaymentMode } from "@/lib/format";
import { WhatsAppMessageModal } from "@/components/modals/WhatsAppMessageModal";
import { TimeRangePicker } from "@/components/ui/TimeRangePicker";
import type { BookingRow } from "@/types";

export function BookingForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const initialRange = slotToTimeRange(params.get("slot") || TIME_SLOTS[0]);
  const [businessDate, setBusinessDate] = useState(params.get("date") || defaultDate);
  const [fromTime, setFromTime] = useState(initialRange.from);
  const [toTime, setToTime] = useState(initialRange.to);
  const [selectedTurf, setSelectedTurf] = useState(Number(params.get("turf") || 1));
  const [bookedTurfs, setBookedTurfs] = useState<number[]>([]);
  const [totalAmount, setTotalAmount] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [advancePaymentMode, setAdvancePaymentMode] = useState("CASH");
  const [cashPortion, setCashPortion] = useState("0");
  const [savedBooking, setSavedBooking] = useState<BookingRow | null>(null);
  const timeSlot = useMemo(() => timeRangeToSlot(fromTime, toTime), [fromTime, toTime]);
  const availableTurfs = TURFS.map((turf) => turf.number).filter((number) => !bookedTurfs.includes(number));
  const allBooked = availableTurfs.length === 0;
  const remainingDue = Math.max(Number(totalAmount || 0) - Number(advanceAmount || 0), 0);

  useEffect(() => {
    if (advancePaymentMode === "CASH") setCashPortion(advanceAmount || "0");
  }, [advanceAmount, advancePaymentMode]);

  useEffect(() => {
    let ignore = false;
    async function loadAvailability() {
      if (!businessDate || !timeSlot) return;
      const query = new URLSearchParams({ businessDate, timeSlot });
      const response = await fetch(`/api/bookings/availability?${query}`);
      if (!response.ok) return;
      const body = await response.json();
      if (ignore) return;
      const booked = body.bookedTurfs as number[];
      const available = body.availableTurfs as number[];
      setBookedTurfs(booked);
      if (available.length && booked.includes(selectedTurf)) setSelectedTurf(available[0]);
      if (available.length && !selectedTurf) setSelectedTurf(available[0]);
    }
    loadAvailability();
    return () => {
      ignore = true;
    };
  }, [businessDate, selectedTurf, timeSlot]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (allBooked) return toast.error("All turfs are fully booked for this time slot.");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const advanceValue = Number(advanceAmount || 0);
    const body = {
      businessDate,
      turfNumber: selectedTurf,
      timeSlot,
      timeOverride: String(form.get("timeOverride") || ""),
      customerName: String(form.get("customerName")),
      phone: String(form.get("phone")),
      totalAmount: Number(totalAmount),
      advanceAmount: advanceValue,
      advancePaymentMode,
      cashPortion: advancePaymentMode === "CASH" ? Number(cashPortion || 0) : null,
      cashAmount: advancePaymentMode === "CASH" ? Number(cashPortion || 0) : 0,
      referenceName: String(form.get("referenceName") || ""),
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

    const created = await response.json();
    toast.success("Booking saved! Copy the confirmation message next.");
    setSavedBooking(normalizeBooking(created.booking));
  }

  const inputClass = "focus-ring w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white";
  const labelClass = "mb-2 block text-sm font-medium text-zinc-300";

  if (savedBooking) {
    return (
      <WhatsAppMessageModal
        booking={savedBooking}
        onClose={() => {
          setSavedBooking(null);
          router.back();
          router.refresh();
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass-panel grid gap-5 rounded-[2rem] p-6 md:grid-cols-2">
      <label>
        <span className={labelClass}>Business Date</span>
        <input type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} required className={inputClass} />
      </label>
      <div>
        <span className={labelClass}>Time Slot</span>
        <TimeRangePicker fromValue={fromTime} toValue={toTime} onFromChange={setFromTime} onToChange={setToTime} />
      </div>
      <div className="md:col-span-2">
        <span className={labelClass}>Turf Availability</span>
        <div className="grid gap-3 sm:grid-cols-4">
          {TURFS.map((turf) => {
            const booked = bookedTurfs.includes(turf.number);
            const selected = selectedTurf === turf.number;
            return (
              <button
                key={turf.number}
                type="button"
                disabled={booked}
                onClick={() => setSelectedTurf(turf.number)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${selected ? "border-[var(--infinity-lime)] bg-[var(--infinity-lime)] text-black" : booked ? "border-red-500/40 bg-red-500/10 text-red-200 opacity-60" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"}`}
              >
                <span className="block font-black">{turf.name}</span>
                <span className="text-xs">{booked ? "Booked" : selected ? "Auto-selected" : "Available"}</span>
              </button>
            );
          })}
        </div>
        {allBooked ? <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">All turfs are fully booked for this time slot. Please select a different time.</p> : null}
      </div>
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
        <input required min={1} type="number" value={totalAmount} onChange={(event) => setTotalAmount(event.target.value)} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Advance Received (₹)</span>
        <input min={0} type="number" value={advanceAmount} onChange={(event) => setAdvanceAmount(event.target.value)} className={inputClass} />
      </label>
      <div>
        <span className={labelClass}>Advance Payment Mode</span>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_MODES.filter((mode) => mode !== "SPLIT").map((mode) => (
            <button key={mode} type="button" onClick={() => setAdvancePaymentMode(mode)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${advancePaymentMode === mode ? "border-[var(--infinity-lime)] bg-[var(--infinity-lime)] text-black" : "border-white/10 bg-black/30 text-zinc-300"}`}>
              {titlePaymentMode(mode)}
            </button>
          ))}
        </div>
      </div>
      {advancePaymentMode === "CASH" ? (
        <label>
          <span className={labelClass}>Cash in Hand (₹)</span>
          <input min={0} type="number" value={cashPortion} onChange={(event) => setCashPortion(event.target.value)} className={inputClass} />
        </label>
      ) : null}
      <label>
        <span className={labelClass}>Reference / Booked By</span>
        <select name="referenceName" className={inputClass}>
          <option value="">Select reference</option>
          {REFERENCE_NAMES.map((name) => <option key={name}>{name}</option>)}
        </select>
      </label>
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
        Remaining due at ground: ₹{remainingDue.toLocaleString("en-IN")}
      </div>
      <label className="md:col-span-2">
        <span className={labelClass}>Notes</span>
        <textarea name="notes" rows={3} className={inputClass} />
      </label>
      <div className="flex gap-3 md:col-span-2">
        <button disabled={loading || allBooked} className="rounded-2xl bg-[var(--infinity-lime)] px-6 py-3 font-bold text-black disabled:opacity-60">
          {loading ? "Saving..." : "Save Booking"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-2xl border border-white/10 px-6 py-3 text-zinc-300">
          Cancel
        </button>
      </div>
    </form>
  );
}

function normalizeBooking(raw: any): BookingRow {
  const businessDate = raw.businessDate;
  const createdAt = raw.createdAt;
  const verifiedAt = raw.verifiedAt;
  return {
    ...raw,
    businessDate: typeof businessDate === "string" ? businessDate.slice(0, 10) : businessDate?.toISOString().slice(0, 10) ?? "",
    createdAt: typeof createdAt === "string" ? createdAt : createdAt?.toISOString() ?? "",
    verifiedAt: verifiedAt ? (typeof verifiedAt === "string" ? verifiedAt : verifiedAt.toISOString()) : null,
    cashPortion: raw.cashPortion ?? null,
    referenceName: raw.referenceName ?? null,
    editRequests: raw.editRequests ?? [],
  };
}
