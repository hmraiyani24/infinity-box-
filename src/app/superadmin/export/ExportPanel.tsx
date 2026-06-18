"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function ExportPanel() {
  const [period, setPeriod] = useState<"day" | "month" | "year">("month");
  const [selectedDate, setSelectedDate] = useState("2026-06-18");
  const [selectedMonth, setSelectedMonth] = useState(6);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [loading, setLoading] = useState<"excel" | "pdf" | null>(null);

  async function download(kind: "excel" | "pdf") {
    setLoading(kind);
    const response = await fetch(`/api/export/${kind}?${buildParams()}`);
    setLoading(null);

    if (!response.ok) {
      toast.error(`Unable to export ${kind.toUpperCase()}`);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `InfinityBox_export.${kind === "excel" ? "xlsx" : "pdf"}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function buildParams() {
    const params = new URLSearchParams({ period });
    if (period === "day") params.set("date", selectedDate);
    if (period === "month") {
      params.set("month", String(selectedMonth));
      params.set("year", String(selectedYear));
    }
    if (period === "year") params.set("year", String(selectedYear));
    return params.toString();
  }

  return (
    <div className="glass-panel rounded-[2rem] p-6">
      <h2 className="text-2xl font-black text-white">Export Data</h2>
      <div className="mt-6 flex flex-wrap gap-2">
        {(["day", "month", "year"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setPeriod(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${period === item ? "bg-[var(--infinity-lime)] text-black" : "border border-white/10 text-zinc-300"}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {period === "day" ? (
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white" />
        ) : null}
        {period === "month" ? (
          <>
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white">
              {months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
            <YearSelect value={selectedYear} onChange={setSelectedYear} />
          </>
        ) : null}
        {period === "year" ? <YearSelect value={selectedYear} onChange={setSelectedYear} /> : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => download("excel")} disabled={loading !== null} className="rounded-2xl bg-[var(--infinity-lime)] px-5 py-3 font-bold text-black disabled:opacity-60">
          {loading === "excel" ? "Preparing..." : "Download Excel (.xlsx)"}
        </button>
        <button onClick={() => download("pdf")} disabled={loading !== null} className="rounded-2xl border border-white/10 px-5 py-3 font-bold text-zinc-200 disabled:opacity-60">
          {loading === "pdf" ? "Preparing..." : "Download PDF"}
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
        Excel format matches the original Infinity Box register: rows are time slots, columns are dates times 4 turfs, with daily cash and bank totals at the bottom.
      </div>
    </div>
  );
}

function YearSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white">
      {[2025, 2026, 2027, 2028].map((year) => <option key={year} value={year}>{year}</option>)}
    </select>
  );
}
