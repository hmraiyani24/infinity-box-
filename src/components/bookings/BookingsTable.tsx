"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatSlotDisplay, getAdvanceBreakdown, TURFS, type Role } from "@/lib/constants";
import { currency, formatPhone, titlePaymentMode } from "@/lib/format";
import type { BookingRow } from "@/types";

type Filters = {
  search: string;
  from: string;
  to: string;
  status: string;
  turf: string;
  staff: string;
};

export function BookingsTable({ role, userId }: { role: Role; userId: string }) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [filters, setFilters] = useState<Filters>({ search: "", from: "", to: "", status: "all", turf: "all", staff: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = new URLSearchParams({ status: "all" });
    if (role === "SUPERVISOR") query.set("createdById", userId);
    fetch(`/api/bookings?${query}`)
      .then((response) => response.json())
      .then((body) => setBookings((body.bookings ?? []).map(normalizeBooking)))
      .catch(() => toast.error("Unable to load bookings"))
      .finally(() => setLoading(false));
  }, [role, userId]);

  const visible = useMemo(() => {
    return bookings.filter((booking) => {
      const search = filters.search.toLowerCase().trim();
      const date = booking.businessDate.slice(0, 10);
      if (search && !`${booking.customerName} ${booking.phone}`.toLowerCase().includes(search)) return false;
      if (filters.from && date < filters.from) return false;
      if (filters.to && date > filters.to) return false;
      if (filters.status !== "all" && booking.status !== filters.status) return false;
      if (filters.turf !== "all" && booking.turfNumber !== Number(filters.turf)) return false;
      if (filters.staff && !booking.staffName.toLowerCase().includes(filters.staff.toLowerCase())) return false;
      return true;
    });
  }, [bookings, filters]);

  function update(name: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function refreshBooking(id: string) {
    setBookings((current) => current.filter((booking) => booking.id !== id));
  }

  const input = "rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[var(--infinity-lime)]";

  return (
    <section className="space-y-4">
      <div className="glass-panel grid gap-3 rounded-[2rem] p-4 md:grid-cols-3 lg:grid-cols-6">
        <input value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder="Search name or phone" className={input} />
        <input type="date" value={filters.from} onChange={(event) => update("from", event.target.value)} className={input} />
        <input type="date" value={filters.to} onChange={(event) => update("to", event.target.value)} className={input} />
        <select value={filters.status} onChange={(event) => update("status", event.target.value)} className={input}>
          <option value="all">All status</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
        </select>
        <select value={filters.turf} onChange={(event) => update("turf", event.target.value)} className={input}>
          <option value="all">All turfs</option>
          {TURFS.map((turf) => <option key={turf.number} value={turf.number}>{turf.name}</option>)}
        </select>
        <input value={filters.staff} onChange={(event) => update("staff", event.target.value)} placeholder="Staff name" className={input} />
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--infinity-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1900px] text-left text-sm">
            <thead className="bg-black/30 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                {["#", "Status", "Name", "Phone", "Turf", "Slot", "Date", "Total ₹", "Advance ₹", "Pending ₹", "Cash ₹", "HG Bank ₹", "DK Bank ₹", "Ref", "Staff", "Entry By", "Approval", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-4">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map((booking, index) => (
                <BookingRowView key={booking.id} booking={booking} index={index} role={role} userId={userId} onRemoved={refreshBooking} />
              ))}
              {!visible.length ? (
                <tr>
                  <td colSpan={18} className="px-4 py-10 text-center text-zinc-500">{loading ? "Loading bookings..." : "No records found."}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function BookingRowView({ booking, index, role, userId, onRemoved }: { booking: BookingRow; index: number; role: Role; userId: string; onRemoved: (id: string) => void }) {
  const pending = Math.max(booking.totalAmount - booking.advanceAmount, 0);
  const rowStatus = getRowStatus(booking);
  const slot = formatSlotDisplay(booking.timeSlot);
  const advanceMode = booking.advancePaymentMode || booking.paymentMode || "CASH";
  const breakdown = getAdvanceBreakdown(booking);
  const color = rowStatus === "green" ? "#22C55E" : rowStatus === "red" ? "#EF4444" : "#F59E0B";
  const hasPendingEdit = Boolean(booking.editRequests?.length);

  async function approve() {
    const response = await fetch(`/api/bookings/${booking.id}/verify`, { method: "PATCH" });
    if (!response.ok) return toast.error("Unable to approve booking");
    toast.success("Booking approved");
    location.reload();
  }

  async function remove() {
    const pin = window.prompt("Enter admin PIN to delete this booking");
    if (!pin) return;
    const response = await fetch(`/api/bookings/${booking.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, reason: "Deleted from bookings table" }),
    });
    if (!response.ok) return toast.error("Delete failed. Check PIN.");
    toast.success("Booking deleted");
    onRemoved(booking.id);
  }

  return (
    <tr className="text-zinc-300" style={{ borderLeft: `4px solid ${color}` }}>
      <td className="px-4 py-4">{index + 1}</td>
      <td className="px-4 py-4"><span title={statusTitle(rowStatus, pending)} style={{ color }}>●</span></td>
      <td className="px-4 py-4 font-bold text-white">{booking.customerName}</td>
      <td className="px-4 py-4"><CopyPhone phone={booking.phone} /></td>
      <td className="px-4 py-4">Turf {booking.turfNumber}</td>
      <td className="px-4 py-4">From: {slot.from}<p className="text-xs text-zinc-500">To: {slot.to}</p>{booking.timeOverride ? <p className="text-xs italic text-amber-300">{booking.timeOverride}</p> : null}</td>
      <td className="px-4 py-4">{new Date(`${booking.businessDate.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
      <td className="px-4 py-4 font-black text-emerald-300">{currency(booking.totalAmount)}</td>
      <td className="px-4 py-4">{currency(booking.advanceAmount)}</td>
      <td className={`px-4 py-4 ${pending > 0 ? "text-amber-300" : ""}`}>{currency(pending)}</td>
      <td className="px-4 py-4">{currency(breakdown.cash)}</td>
      <td className="px-4 py-4">{currency(breakdown.hgBank)}</td>
      <td className="px-4 py-4">{currency(breakdown.dkBank)}</td>
      <td className="px-4 py-4 text-xs text-zinc-500">{booking.referenceName || "-"}</td>
      <td className="px-4 py-4">
        {booking.staffName}
        {booking.lastEditedByName ? <p className="text-xs text-zinc-500">edited by {booking.lastEditedByName}</p> : null}
      </td>
      <td className="px-4 py-4">
        {booking.createdBy?.displayName ?? "-"}
        <p className="mt-1 text-[10px] text-zinc-500">{rolePill(booking.createdBy?.role)}</p>
      </td>
      <td className="px-4 py-4">{approvalContent(role, booking, hasPendingEdit, approve)}</td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {role === "SUPERVISOR" && booking.createdById === userId ? <Link href={`/supervisor/my-bookings?edit=${booking.id}`} className="text-[var(--infinity-lime)]">Edit</Link> : null}
          {(role === "ADMIN" || role === "SUPER_ADMIN") ? <button onClick={remove} className="text-red-300">Delete</button> : null}
          <span className="text-xs text-zinc-500">{titlePaymentMode(advanceMode)}</span>
        </div>
      </td>
    </tr>
  );
}

function approvalContent(role: Role, booking: BookingRow, hasPendingEdit: boolean, approve: () => void) {
  if (role === "SUPERVISOR") {
    if (hasPendingEdit) return <span className="text-amber-300">Pending</span>;
    if (booking.status === "CONFIRMED") return <span className="text-emerald-300">Confirmed</span>;
    return <Link href={`/supervisor/my-bookings?edit=${booking.id}`} className="text-amber-300">Send for Approval</Link>;
  }
  if ((role === "ADMIN" || role === "SUPER_ADMIN") && booking.status === "PENDING") {
    return <button onClick={approve} className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">Approve</button>;
  }
  if (hasPendingEdit) return <span className="text-amber-300">Edit pending</span>;
  return <span className="text-emerald-300">Auto-confirmed</span>;
}

function CopyPhone({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return <button onClick={copy} className="font-mono text-xs text-zinc-400">{formatPhone(phone)} <span className={copied ? "text-emerald-300" : "text-zinc-600"}>{copied ? "Copied" : "Copy"}</span></button>;
}

function getRowStatus(booking: BookingRow): "green" | "yellow" | "red" {
  const pending = booking.totalAmount - booking.advanceAmount;
  if (booking.status === "PENDING") return "red";
  if (booking.status === "CONFIRMED" && pending === 0) return "green";
  if (booking.status === "CONFIRMED" && pending > 0) return "yellow";
  return "yellow";
}

function statusTitle(status: "green" | "yellow" | "red", pending: number) {
  if (status === "green") return "Fully settled";
  if (status === "red") return "Awaiting approval";
  return `Pending ${currency(pending)} due`;
}

function rolePill(role?: string) {
  if (role === "SUPER_ADMIN") return "SA";
  if (role === "ADMIN") return "Admin";
  if (role === "SUPERVISOR") return "Sup";
  return role || "";
}

function normalizeBooking(raw: any): BookingRow {
  return {
    ...raw,
    businessDate: typeof raw.businessDate === "string" ? raw.businessDate : raw.businessDate?.toISOString().slice(0, 10) ?? "",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : raw.createdAt?.toISOString() ?? "",
    verifiedAt: raw.verifiedAt ? (typeof raw.verifiedAt === "string" ? raw.verifiedAt : raw.verifiedAt.toISOString()) : null,
    lastEditedAt: raw.lastEditedAt ? (typeof raw.lastEditedAt === "string" ? raw.lastEditedAt : raw.lastEditedAt.toISOString()) : null,
    cashPortion: raw.cashPortion ?? null,
    referenceName: raw.referenceName ?? null,
    editRequests: raw.editRequests ?? [],
  };
}
