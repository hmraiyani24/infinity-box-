"use client";

import { TimePicker } from "@/components/ui/TimePicker";

export interface TimeRangePickerProps {
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export function TimeRangePicker({ fromValue, toValue, onFromChange, onToChange }: TimeRangePickerProps) {
  function handleFromChange(value: string) {
    onFromChange(value);
    onToChange(addOneHour(value));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TimePicker label="From" value={fromValue} onChange={handleFromChange} />
      <TimePicker label="To" value={toValue} onChange={onToChange} />
    </div>
  );
}

function addOneHour(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return value;
  let hour = Number(match[1]);
  const minute = match[2];
  let period = match[3].toUpperCase();

  if (hour === 11) {
    hour = 12;
    period = period === "AM" ? "PM" : "AM";
  } else if (hour === 12) {
    hour = 1;
  } else {
    hour += 1;
  }

  return `${hour}:${minute} ${period}`;
}
