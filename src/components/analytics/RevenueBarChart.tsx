"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RevenueBarChart({
  data,
}: {
  data: { month: string; total: number; cash: number; dkBank: number; hgBank: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
        <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} />
        <YAxis tickFormatter={(value) => `Rs${(Number(value) / 1000).toFixed(0)}k`} tick={{ fill: "#888" }} />
        <Tooltip
          formatter={(value, name) => [`Rs ${Number(value).toLocaleString("en-IN")}`, name]}
          contentStyle={{ background: "#1C1C1C", border: "1px solid #2A2A2A", borderRadius: 8, color: "#F0F0F0" }}
        />
        <Legend wrapperStyle={{ color: "#888", fontSize: 12 }} />
        <Bar dataKey="cash" stackId="a" fill="#22C55E" name="Cash" />
        <Bar dataKey="dkBank" stackId="a" fill="#3B82F6" name="DK Bank" />
        <Bar dataKey="hgBank" stackId="a" fill="#8B5CF6" name="HG Bank" />
      </BarChart>
    </ResponsiveContainer>
  );
}
