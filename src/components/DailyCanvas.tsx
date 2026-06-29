"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { addDays, format, startOfWeek, subDays } from "date-fns";
import { BookingActions } from "@/components/BookingActions";
import { WeeklyGrid } from "@/components/canvas/WeeklyGrid";
import { DirectEditModal } from "@/components/modals/DirectEditModal";
import { formatSlotDisplay, getStandardSlotForRange, POST_MIDNIGHT_SLOTS, TIME_SLOTS, TURFS, PAYMENT_MODE_META, STATUS_META, type Role } from "@/lib/constants";
import { currency, formatPhone, titlePaymentMode } from "@/lib/format";
import type { BookingRow } from "@/types";

export function DailyCanvas({
  role,
  userId,
  businessDate,
  bookings,
  totals,
  pendingEditRequests,
}: {
  role: Role;
  userId: string;
  businessDate: string;
  bookings: BookingRow[];
  totals: { total: number; count: number; pending: number; pendingAmount: number; CASH: number; DK_BANK: number; HG_BANK: number; SPLIT: number };
  pendingEditRequests: number;
}) {
  const searchParams = useSearchParams();
  const [localBookings, setLocalBookings] = useState(bookings);
  const [directEditBooking, setDirectEditBooking] = useState<BookingRow | null>(null);
  const [activeTurf, setActiveTurf] = useState(1);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">(searchParams.get("view") === "weekly" ? "weekly" : "daily");
  useEffect(() => setLocalBookings(bookings), [bookings]);
  useEffect(() => {
    setViewMode(searchParams.get("view") === "weekly" ? "weekly" : "daily");
  }, [searchParams]);
  const businessDateObj = useMemo(() => new Date(`${businessDate}T00:00:00`), [businessDate]);
  const dateString = format(businessDateObj, "yyyy-MM-dd");
  const weekStartObj = startOfWeek(businessDateObj, { weekStartsOn: 1 });
  const weekStart = format(weekStartObj, "yyyy-MM-dd");
  const weekEndObj = addDays(weekStartObj, 6);
  const prev = format(viewMode === "weekly" ? subDays(weekStartObj, 7) : subDays(businessDateObj, 1), "yyyy-MM-dd");
  const next = format(viewMode === "weekly" ? addDays(weekStartObj, 7) : addDays(businessDateObj, 1), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");
  const viewQuery = `view=${viewMode}`;
  const dailyHref = `?date=${dateString}&view=daily`;
  const weeklyHref = `?date=${weekStart}&view=weekly`;
  const byCell = new Map<string, BookingRow>();
  localBookings.forEach((booking) => {
    const gridSlot = TIME_SLOTS.includes(booking.timeSlot as never) ? booking.timeSlot : getStandardSlotForRange(booking.timeSlot);
    byCell.set(`${booking.turfNumber}:${gridSlot}`, booking);
  });
  const canReviewEdits = role === "ADMIN" || role === "SUPER_ADMIN";
  const canCreate = role !== "VIEWER";

  return (
    <section className="space-y-5">
      <div className="glass-panel rounded-[2rem] p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm text-zinc-500">{viewMode === "weekly" ? "Selected Week" : "Business Day"}</p>
            <h2 className="text-2xl font-black text-white">
              {viewMode === "weekly"
                ? `${format(weekStartObj, "MMM d")} - ${format(weekEndObj, "MMM d, yyyy")}`
                : format(businessDateObj, "EEEE, MMMM d, yyyy")}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {viewMode === "weekly" ? "Monday to Sunday weekly view" : `6 AM to 6 AM · ${totals.count} booked · ${totals.pending} pending`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={dailyHref} className={`rounded-full px-4 py-2 text-sm font-bold ${viewMode === "daily" ? "bg-[var(--infinity-lime)] text-black" : "border border-white/10 text-zinc-300"}`}>Daily</Link>
            <Link href={weeklyHref} className={`rounded-full px-4 py-2 text-sm font-bold ${viewMode === "weekly" ? "bg-[var(--infinity-lime)] text-black" : "border border-white/10 text-zinc-300"}`}>Weekly</Link>
            <Link href={`?date=${prev}&${viewQuery}`} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:text-white">
              {viewMode === "weekly" ? "Previous Week" : "Previous Day"}
            </Link>
            <Link href={`?date=${today}&${viewQuery}`} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:text-white">
              {viewMode === "weekly" ? "This Week" : "Today"}
            </Link>
            <Link href={`?date=${next}&${viewQuery}`} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:text-white">
              {viewMode === "weekly" ? "Next Week" : "Next Day"}
            </Link>
            {canCreate ? (
              <Link href={`/${role === "SUPER_ADMIN" ? "superadmin" : role === "ADMIN" ? "admin" : "supervisor"}/new-booking?date=${dateString}`} className="rounded-full bg-[var(--infinity-lime)] px-4 py-2 text-sm font-bold text-black">Add Booking</Link>
            ) : null}
          </div>
        </div>
        {role !== "SUPERVISOR" && role !== "VIEWER" ? (
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            <Stat label="Total" value={currency(totals.total)} />
            <Stat label="Cash" value={currency(totals.CASH)} />
            <Stat label="DK Bank" value={currency(totals.DK_BANK)} />
            <Stat label="HG Bank" value={currency(totals.HG_BANK)} />
            <Stat label="Pending" value={currency(totals.pendingAmount)} />
          </div>
        ) : null}
        {canReviewEdits && pendingEditRequests > 0 ? (
          <Link
            href={`/${role === "SUPER_ADMIN" ? "superadmin" : "admin"}/edit-requests`}
            className="mt-4 block rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
          >
            {pendingEditRequests} edit request{pendingEditRequests === 1 ? "" : "s"} pending review
          </Link>
        ) : null}
      </div>

      {viewMode === "weekly" ? <WeeklyGrid weekStartDate={weekStart} role={role} /> : null}

      {viewMode === "daily" ? (
      <>
      <div className="hidden overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--infinity-surface)] lg:block">
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[150px_repeat(4,minmax(190px,1fr))] border-b border-white/10 bg-black/30">
              <div className="p-4 text-sm font-bold text-zinc-400">Time</div>
              {TURFS.map((turf) => (
                <div key={turf.number} className="p-4 text-sm font-bold text-white" style={{ color: turf.color }}>{turf.name}</div>
              ))}
            </div>
            {TIME_SLOTS.map((slot) => (
              <div key={slot} className={`grid grid-cols-[150px_repeat(4,minmax(190px,1fr))] border-b border-white/5 last:border-b-0 ${POST_MIDNIGHT_SLOTS.includes(slot as never) ? "bg-amber-400/[0.04]" : ""}`}>
                <div className={`bg-black/20 p-4 text-sm font-semibold text-zinc-300 ${POST_MIDNIGHT_SLOTS.includes(slot as never) ? "border-l-4 border-amber-400 text-amber-100" : ""}`}>
                  <SlotLabel slot={slot} />
                  {slot.startsWith("12 AM") || slot.startsWith("1 AM") ? <p className="mt-1 text-xs text-zinc-600">past midnight</p> : null}
                </div>
                {TURFS.map((turf) => {
                  const booking = byCell.get(`${turf.number}:${slot}`);
                  return (
                    <div key={turf.number} className="min-h-[132px] border-l border-white/5 p-3">
                      {booking ? (
                        <BookingCard booking={booking} role={role} userId={userId} onDirectEdit={() => setDirectEditBooking(booking)} />
                      ) : canCreate ? (
                        <Link
                          href={`/${role === "SUPER_ADMIN" ? "superadmin" : role === "ADMIN" ? "admin" : "supervisor"}/new-booking?date=${dateString}&turf=${turf.number}&slot=${encodeURIComponent(slot)}`}
                          className="grid h-full min-h-[108px] place-items-center rounded-2xl border border-dashed border-white/10 text-2xl text-zinc-600 transition hover:border-[var(--infinity-lime)] hover:text-[var(--infinity-lime)]"
                        >
                          +
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        <div className="grid grid-cols-4 gap-2">
          {TURFS.map((turf) => (
            <button
              key={turf.number}
              onClick={() => setActiveTurf(turf.number)}
              className={`rounded-2xl border px-3 py-3 text-sm font-black ${activeTurf === turf.number ? "border-[var(--infinity-lime)] bg-[var(--infinity-lime)] text-black" : "border-white/10 bg-black/30 text-zinc-300"}`}
            >
              T{turf.number}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--infinity-surface)]">
          {TIME_SLOTS.map((slot) => {
            const booking = byCell.get(`${activeTurf}:${slot}`);
            return (
              <div key={slot} className={`grid grid-cols-[110px_1fr] gap-3 border-b border-white/5 p-3 last:border-b-0 ${POST_MIDNIGHT_SLOTS.includes(slot as never) ? "bg-amber-400/[0.05]" : ""}`}>
                <div className={`text-xs font-semibold text-zinc-300 ${POST_MIDNIGHT_SLOTS.includes(slot as never) ? "border-l-2 border-amber-400 pl-2 text-amber-100" : ""}`}>
                  <SlotLabel slot={slot} />
                </div>
                {booking ? (
                  <BookingCard booking={booking} role={role} userId={userId} onDirectEdit={() => setDirectEditBooking(booking)} />
                ) : canCreate ? (
                  <Link
                    href={`/${role === "SUPER_ADMIN" ? "superadmin" : role === "ADMIN" ? "admin" : "supervisor"}/new-booking?date=${dateString}&turf=${activeTurf}&slot=${encodeURIComponent(slot)}`}
                    className="grid min-h-[70px] place-items-center rounded-2xl border border-dashed border-white/10 text-2xl text-zinc-600"
                  >
                    +
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      </>
      ) : null}
      {directEditBooking ? (
        <DirectEditModal
          booking={directEditBooking}
          onClose={() => setDirectEditBooking(null)}
          onSaved={(updated) => {
            setLocalBookings((current) => current.map((booking) => (booking.id === updated.id ? { ...booking, ...updated } : booking)));
            setDirectEditBooking(null);
          }}
        />
      ) : null}
    </section>
  );
}

function BookingCard({ booking, role, userId, onDirectEdit }: { booking: BookingRow; role: Role; userId: string; onDirectEdit: () => void }) {
  const turf = TURFS.find((item) => item.number === booking.turfNumber) ?? TURFS[0];
  const advancePaymentMode = booking.advancePaymentMode || booking.paymentMode || "CASH";
  const payment = PAYMENT_MODE_META[advancePaymentMode as keyof typeof PAYMENT_MODE_META];
  const status = STATUS_META[booking.status as keyof typeof STATUS_META];
  const hasPendingEdit = Boolean(booking.editRequests?.length);
  const displayOverride = booking.timeOverride || (TIME_SLOTS.includes(booking.timeSlot as never) ? "" : booking.timeSlot);

  return (
    <article className="h-full rounded-2xl border border-white/10 bg-black/35 p-4 shadow-2xl" style={{ borderLeft: `5px solid ${turf.color}` }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${status?.color ?? "#71717a"}22`, color: status?.color ?? "#d4d4d8" }}>
          {status?.label ?? booking.status}
        </span>
        {hasPendingEdit ? <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-200">Edit Pending</span> : null}
      </div>
      <h3 className="truncate text-base font-black text-white">{booking.customerName}</h3>
      <CopyPhone phone={booking.phone} />
      <p className="mt-3 text-xl font-black text-[var(--infinity-lime)]">{currency(booking.totalAmount)}</p>
      <p className="mt-1 text-xs text-zinc-400">Adv {currency(booking.advanceAmount)} · <span style={{ color: payment?.color }}>{payment?.label ?? titlePaymentMode(advancePaymentMode)}</span></p>
      <p className="mt-1 text-xs text-zinc-500">{booking.staffName}{displayOverride ? ` · ${displayOverride}` : ""}</p>
      {booking.referenceName ? <p className="mt-1 text-[10px] text-zinc-600">ref: {booking.referenceName}</p> : null}
      {role !== "VIEWER" ? (
        <BookingActions
          bookingId={booking.id}
          role={role}
          ownsBooking={booking.createdById === userId}
          hasPendingEdit={hasPendingEdit}
          bookingStatus={booking.status}
          onDirectEdit={onDirectEdit}
        />
      ) : null}
    </article>
  );
}

function SlotLabel({ slot }: { slot: string }) {
  const display = formatSlotDisplay(slot);
  return (
    <div>
      <p>From: {display.from}</p>
      <p className="text-xs text-zinc-500">To: {display.to}</p>
    </div>
  );
}

function CopyPhone({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={handleCopy} className="mt-1 cursor-pointer select-none text-left font-mono text-xs text-zinc-500">
      {formatPhone(phone)}
      <span className="ml-1 text-[11px]" style={{ color: copied ? "#22C55E" : "#71717a" }}>
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
