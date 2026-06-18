"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { currency } from "@/lib/format";

export function TurfUtilizationChart({
  data,
}: {
  data: { turf: string; bookings: number; revenue: number; pct?: number; color: string }[];
}) {
  const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="h-[300px] rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ left: 20, right: 40 }}>
            <XAxis type="number" tick={{ fill: "#888", fontSize: 11 }} />
            <YAxis type="category" dataKey="turf" tick={{ fill: "#F0F0F0", fontSize: 12 }} width={70} />
            <Bar dataKey="bookings" radius={[0, 8, 8, 0]}>
              {data.map((row, index) => (
                <Cell key={row.turf} fill={row.color} />
              ))}
              <LabelList dataKey="bookings" position="right" fill="#F0F0F0" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Turf</th>
              <th className="px-4 py-3">Bookings</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">% Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((row) => (
              <tr key={row.turf} className="text-zinc-300">
                <td className="px-4 py-3">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                  {row.turf}
                </td>
                <td className="px-4 py-3">{row.bookings}</td>
                <td className="px-4 py-3">{currency(row.revenue)}</td>
                <td className="px-4 py-3">{(row.pct ?? (totalRevenue ? (row.revenue / totalRevenue) * 100 : 0)).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
