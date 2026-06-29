"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PAYMENT_MODES, REFERENCE_NAMES, TURFS, slotToTimeRange, timeRangeToSlot } from "@/lib/constants";
import { TimeRangePicker } from "@/components/ui/TimeRangePicker";
import type { BookingRow } from "@/types";

export interface DirectEditModalProps {
  booking: BookingRow;
  onClose: () => void;
  onSaved: (updated: BookingRow) => void;
}

export function DirectEditModal({ booking, onClose, onSaved }: DirectEditModalProps) {
  const [form, setForm] = useState({
    customerName: booking.customerName,
    phone: booking.phone,
    turfNumber: String(booking.turfNumber),
    businessDate: booking.businessDate,
    fromTime: slotToTimeRange(booking.timeSlot).from,
    toTime: slotToTimeRange(booking.timeSlot).to,
    timeOverride: booking.timeOverride ?? "",
    totalAmount: String(booking.totalAmount),
    advanceAmount: String(booking.advanceAmount),
    advancePaymentMode: booking.advancePaymentMode || booking.paymentMode || "CASH",
    cashPortion: String(booking.cashPortion ?? booking.cashAmount ?? 0),
    cashAmount: String(booking.cashAmount ?? 0),
    referenceName: booking.referenceName ?? "",
    notes: booking.notes ?? "",
  });
  const [forceOverride, setForceOverride] = useState(false);
  const [conflict, setConflict] = useState<BookingRow | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const slotChanged = useMemo(
    () =>
      Number(form.turfNumber) !== booking.turfNumber ||
      timeRangeToSlot(form.fromTime, form.toTime) !== booking.timeSlot ||
      form.businessDate !== booking.businessDate,
    [booking.businessDate, booking.timeSlot, booking.turfNumber, form.businessDate, form.fromTime, form.toTime, form.turfNumber],
  );

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setConflict(null);
    setError("");
  }

  async function checkConflict() {
    if (!slotChanged || forceOverride) return null;

    const params = new URLSearchParams({
      businessDate: form.businessDate,
      turfNumber: form.turfNumber,
      timeSlot: timeRangeToSlot(form.fromTime, form.toTime),
    });
    const response = await fetch(`/api/bookings?${params}`);
    if (!response.ok) return null;
    const body = await response.json();
    const found = (body.bookings as BookingRow[]).find((item) => item.id !== booking.id);
    setConflict(found ?? null);
    return found ?? null;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.customerName.trim() || !form.phone.trim() || !form.businessDate || !form.fromTime || !form.toTime) {
      setError("Customer, phone, date, and time slot are required.");
      return;
    }

    const found = await checkConflict();
    if (found && !forceOverride) {
      setError(`Conflict: ${found.customerName} at this slot.`);
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: form.customerName,
        phone: form.phone,
        turfNumber: Number(form.turfNumber),
        businessDate: form.businessDate,
        timeSlot: timeRangeToSlot(form.fromTime, form.toTime),
        timeOverride: form.timeOverride || null,
        totalAmount: Number(form.totalAmount),
        advanceAmount: Number(form.advanceAmount),
        advancePaymentMode: form.advancePaymentMode,
        cashPortion: form.advancePaymentMode === "CASH" ? Number(form.cashPortion || 0) : null,
        cashAmount: form.advancePaymentMode === "CASH" ? Number(form.cashPortion || 0) : 0,
        referenceName: form.referenceName || null,
        notes: form.notes || null,
        forceOverride,
      }),
    });
    setSaving(false);

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 409 && body.conflictWith) {
        setConflict(body.conflictWith);
        setError(`Conflict: ${body.conflictWith.customerName} at this slot.`);
        return;
      }
      setError(body.error || "Unable to save booking.");
      return;
    }

    toast.success("Booking updated.");
    onSaved(normalizeBooking(body));
  }

  const inputClass = "w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-[var(--infinity-lime)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[var(--infinity-surface)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Direct Edit — #{booking.id.slice(0, 8)}</h2>
            <p className="mt-1 text-sm text-zinc-500">Super Admin only</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:text-white">
            Close
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Super Admin edit — changes apply immediately without approval.
        </div>

        {slotChanged ? (
          <div className="mt-3 rounded-2xl border border-amber-400/30 bg-black/40 px-4 py-3 text-sm text-amber-100">
            Changing turf/slot/date — system will check for conflicts.
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
            {conflict ? (
              <label className="mt-3 flex items-center gap-2 text-xs text-red-100">
                <input type="checkbox" checked={forceOverride} onChange={(event) => setForceOverride(event.target.checked)} />
                Override anyway
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Customer Name"><input value={form.customerName} onChange={(e) => update("customerName", e.target.value)} className={inputClass} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} /></Field>
          <Field label="Business Date"><input type="date" value={form.businessDate} onChange={(e) => update("businessDate", e.target.value)} className={inputClass} /></Field>
          <Field label="Turf">
            <select value={form.turfNumber} onChange={(e) => update("turfNumber", e.target.value)} className={inputClass}>
              {TURFS.map((turf) => <option key={turf.number} value={turf.number}>{turf.name}</option>)}
            </select>
          </Field>
          <Field label="Time Slot">
            <TimeRangePicker fromValue={form.fromTime} toValue={form.toTime} onFromChange={(value) => update("fromTime", value)} onToChange={(value) => update("toTime", value)} />
          </Field>
          <Field label="Time Override"><input value={form.timeOverride} onChange={(e) => update("timeOverride", e.target.value)} className={inputClass} /></Field>
          <Field label="Total Amount"><input type="number" value={form.totalAmount} onChange={(e) => update("totalAmount", e.target.value)} className={inputClass} /></Field>
          <Field label="Advance Amount"><input type="number" value={form.advanceAmount} onChange={(e) => update("advanceAmount", e.target.value)} className={inputClass} /></Field>
          <Field label="Advance Payment Mode">
            <select value={form.advancePaymentMode} onChange={(e) => update("advancePaymentMode", e.target.value)} className={inputClass}>
              {PAYMENT_MODES.filter((mode) => mode !== "SPLIT").map((mode) => <option key={mode}>{mode}</option>)}
            </select>
          </Field>
          {form.advancePaymentMode === "CASH" ? <Field label="Cash in Hand"><input type="number" value={form.cashPortion} onChange={(e) => update("cashPortion", e.target.value)} className={inputClass} /></Field> : null}
          <Field label="Reference / Booked By">
            <select value={form.referenceName} onChange={(e) => update("referenceName", e.target.value)} className={inputClass}>
              <option value="">Select reference</option>
              {REFERENCE_NAMES.map((name) => <option key={name}>{name}</option>)}
            </select>
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className={inputClass} rows={3} />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-5 py-3 text-zinc-300">Cancel</button>
          <button disabled={saving} className="rounded-2xl bg-[var(--infinity-lime)] px-5 py-3 font-bold text-black disabled:opacity-60">
            {saving ? "Saving..." : "Save Changes Now"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

type RawBookingResponse = Omit<BookingRow, "businessDate" | "createdAt" | "verifiedAt"> & {
  businessDate?: string | Date;
  createdAt?: string | Date;
  verifiedAt?: string | Date | null;
};

function normalizeBooking(raw: RawBookingResponse): BookingRow {
  const businessDate = raw.businessDate;
  const createdAt = raw.createdAt;
  const verifiedAt = raw.verifiedAt;

  return {
    ...raw,
    businessDate: typeof businessDate === "string" ? businessDate.slice(0, 10) : businessDate?.toISOString().slice(0, 10) ?? "",
    createdAt: typeof createdAt === "string" ? createdAt : createdAt?.toISOString() ?? "",
    verifiedAt: verifiedAt ? (typeof verifiedAt === "string" ? verifiedAt : verifiedAt.toISOString()) : null,
    editRequests: raw.editRequests ?? [],
  };
}
