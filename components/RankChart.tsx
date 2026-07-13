"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { GaugeConfig, GaugeData } from "@/lib/types";
import { computeRank } from "@/lib/scoring";

export default function RankChart({ data, config }: { data: GaugeData; config: GaugeConfig }) {
  const years = Object.values(data.countries)
    .flatMap((c) => c.series.map((p) => p.year))
    .filter((y, i, arr) => arr.indexOf(y) === i)
    .sort((a, b) => a - b);

  const peerCount = Object.keys(data.countries).length;
  const rows = years
    .map((year) => {
      const rank = computeRank(data, config, "AUS", year);
      return rank ? { year, rank: rank.rank } : null;
    })
    .filter((r): r is { year: number; rank: number } => r !== null);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey="year"
          stroke="var(--baseline)"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          reversed
          domain={[1, peerCount]}
          allowDecimals={false}
          stroke="var(--baseline)"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={32}
          label={{ value: "Rank", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-1)",
            borderColor: "var(--gridline)",
            fontSize: 12,
            color: "var(--text-primary)",
          }}
          formatter={(value) => [`Rank ${value} of ${peerCount}`, "Australia"]}
        />
        <Line
          type="monotone"
          dataKey="rank"
          stroke="var(--accent-australia)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "var(--accent-australia)" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
