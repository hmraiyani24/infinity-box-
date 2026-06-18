"use client";

import { POST_MIDNIGHT_SLOTS, TIME_SLOTS } from "@/lib/constants";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SlotHeatmap({ data }: { data: Record<string, Record<string, number>> }) {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
      <div className="min-w-[620px]">
        <div className="grid grid-cols-[150px_repeat(7,40px)] gap-2">
          <div />
          {DAYS.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-zinc-500">{day}</div>
          ))}
          {TIME_SLOTS.map((slot) => (
            <HeatmapRow key={slot} slot={slot} values={data[slot] ?? {}} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeatmapRow({ slot, values }: { slot: string; values: Record<string, number> }) {
  const isPostMidnight = POST_MIDNIGHT_SLOTS.includes(slot as never);

  return (
    <>
      <div className={`sticky left-0 bg-black/70 py-2 pr-3 text-xs text-zinc-400 ${isPostMidnight ? "border-l-2 border-amber-400 pl-2 text-amber-200" : ""}`}>
        {slot}
      </div>
      {DAYS.map((day) => {
        const count = values[day] ?? 0;
        return (
          <div
            key={day}
            title={`${count} bookings - ${slot} on ${day}`}
            className="grid h-10 w-10 place-items-center rounded text-[11px] text-white transition hover:scale-[1.15]"
            style={{ backgroundColor: colorForCount(count) }}
          >
            {count > 0 ? count : ""}
          </div>
        );
      })}
    </>
  );
}

function colorForCount(count: number) {
  if (count <= 0) return "#0A0A0A";
  if (count === 1) return "#052e16";
  if (count <= 3) return "#14532d";
  if (count <= 6) return "#166534";
  if (count <= 10) return "#15803d";
  return "#16a34a";
}
