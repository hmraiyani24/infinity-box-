"use client";

import { useMemo } from "react";

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = ["00", "15", "30", "45"];
const PERIODS = ["AM", "PM"];

export interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const parsed = useMemo(() => parseTime(value), [value]);

  function update(next: Partial<typeof parsed>) {
    const merged = { ...parsed, ...next };
    onChange(`${Number(merged.hour)}:${merged.minute} ${merged.period}`);
  }

  const selectClass = "h-12 min-w-0 flex-1 border border-[var(--ib-border,#333)] bg-[#1C1C1C] px-3 text-center font-semibold text-white outline-none focus:border-[var(--ib-lime,var(--infinity-lime))] sm:h-14";

  return (
    <label className="block">
      {label ? <span className="mb-2 block text-sm text-zinc-400">{label}</span> : null}
      <div className="flex w-full overflow-hidden rounded-2xl">
        <select value={parsed.hour} onChange={(event) => update({ hour: event.target.value })} className={`${selectClass} rounded-l-2xl`}>
          {HOURS.map((hour) => <option key={hour} value={hour}>{hour.padStart(2, "0")}</option>)}
        </select>
        <select value={parsed.minute} onChange={(event) => update({ minute: event.target.value })} className={`${selectClass} -ml-px rounded-none`}>
          {MINUTES.map((minute) => <option key={minute}>{minute}</option>)}
        </select>
        <select value={parsed.period} onChange={(event) => update({ period: event.target.value })} className={`${selectClass} -ml-px rounded-r-2xl`}>
          {PERIODS.map((period) => <option key={period}>{period}</option>)}
        </select>
      </div>
    </label>
  );
}

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return { hour: "9", minute: "00", period: "AM" };
  return {
    hour: String(Math.min(Math.max(Number(match[1]), 1), 12)),
    minute: MINUTES.includes(match[2]) ? match[2] : "00",
    period: match[3].toUpperCase(),
  };
}
