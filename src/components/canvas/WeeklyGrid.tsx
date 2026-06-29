"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { formatSlotDisplay, TIME_SLOTS, TURFS, type Role } from "@/lib/constants";
import { currency } from "@/lib/format";
import type { BookingRow } from "@/types";

export function WeeklyGrid({ weekStartDate, role }: { weekStartDate: string; role: Role }) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(`${weekStartDate}T00:00:00`), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [weekStartDate]);

  useEffect(() => {
    const from = format(weekDays[0], "yyyy-MM-dd");
    const to = format(weekDays[6], "yyyy-MM-dd");
    fetch(`/api/bookings?from=${from}&to=${to}`)
      .then((response) => response.json())
      .then((body) => setBookings(body.bookings ?? []))
      .catch(() => setBookings([]));
  }, [weekDays]);

  const byCell = new Map<string, BookingRow>();
  bookings.forEach((booking) => byCell.set(`${booking.businessDate.slice(0, 10)}:${booking.timeSlot}`, booking));
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--infinity-surface)]">
      <div className="overflow-x-auto">
        <div className="min-w-[1180px]">
          <div className="grid grid-cols-[150px_repeat(7,minmax(140px,1fr))] border-b border-white/10 bg-black/30">
            <div className="p-4 text-sm font-bold text-zinc-400">Time</div>
            {weekDays.map((day) => {
              const date = format(day, "yyyy-MM-dd");
              return <div key={date} className={`p-4 text-sm font-bold text-white ${date === today ? "border-l-4 border-[var(--infinity-lime)]" : ""}`}>{format(day, "EEE dd")}</div>;
            })}
          </div>
          {TIME_SLOTS.map((slot) => {
            const slotDisplay = formatSlotDisplay(slot);
            return (
              <div key={slot} className="grid grid-cols-[150px_repeat(7,minmax(140px,1fr))] border-b border-white/5 last:border-b-0">
                <div className="bg-black/20 p-4 text-xs font-semibold text-zinc-300">
                  From: {slotDisplay.from}
                  <p className="text-zinc-500">To: {slotDisplay.to}</p>
                </div>
                {weekDays.map((day) => {
                  const date = format(day, "yyyy-MM-dd");
                  const booking = byCell.get(`${date}:${slot}`);
                  const turf = booking ? TURFS.find((item) => item.number === booking.turfNumber) : null;
                  return (
                    <div key={date} className={`min-h-[112px] border-l border-white/5 p-2 ${date === today ? "border-l-[var(--infinity-lime)]" : ""}`}>
                      {booking ? (
                        <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs">
                          <p className="truncate font-black text-white"><span style={{ color: turf?.color }}>●</span> {booking.customerName}</p>
                          <p className="mt-1 text-zinc-300">Turf {booking.turfNumber} · {currency(booking.totalAmount)}</p>
                          <p className="mt-1 truncate text-[11px] text-zinc-500">{booking.staffName}</p>
                          {role !== "VIEWER" && booking.status === "PENDING" ? <p className="mt-1 text-[10px] text-amber-200">Pending approval</p> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
