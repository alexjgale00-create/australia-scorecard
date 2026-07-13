"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { GaugeData } from "@/lib/types";

type Row = { year: number } & Record<string, number | undefined>;

function pivot(data: GaugeData): Row[] {
  const years = Object.values(data.countries)
    .flatMap((c) => c.series.map((p) => p.year))
    .filter((y, i, arr) => arr.indexOf(y) === i)
    .sort((a, b) => a - b);

  return years.map((year) => {
    const row: Row = { year };
    for (const [code, country] of Object.entries(data.countries)) {
      const point = country.series.find((p) => p.year === year);
      if (point) row[code] = point.value;
    }
    return row;
  });
}

function CustomTooltip({
  active,
  payload,
  label,
  data,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: number;
  data: GaugeData;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const sorted = [...payload].sort((a, b) => (a.dataKey === "AUS" ? -1 : b.dataKey === "AUS" ? 1 : 0));
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-sm"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--gridline)",
        color: "var(--text-primary)",
      }}
    >
      <div className="mb-1 font-semibold">{label}</div>
      {sorted.map((entry) => {
        const isAus = entry.dataKey === "AUS";
        return (
          <div key={entry.dataKey} className="flex justify-between gap-4">
            <span style={{ color: isAus ? "var(--accent-australia)" : "var(--text-secondary)" }}>
              {data.countries[entry.dataKey as keyof typeof data.countries]?.name ?? entry.dataKey}
            </span>
            <span className="tabular-nums" style={{ fontWeight: isAus ? 600 : 400 }}>
              {entry.value.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function TimeSeriesChart({ data }: { data: GaugeData }) {
  const rows = pivot(data);
  const countryCodes = Object.keys(data.countries);

  return (
    <div>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="year"
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            stroke="var(--baseline)"
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip data={data} />} />
          {countryCodes
            .filter((c) => c !== "AUS")
            .map((code) => (
              <Line
                key={code}
                type="monotone"
                dataKey={code}
                stroke="var(--peer-line)"
                strokeWidth={1.5}
                strokeOpacity={0.55}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          {countryCodes.includes("AUS") && (
            <Line
              type="monotone"
              dataKey="AUS"
              stroke="var(--accent-australia)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        <span className="font-semibold" style={{ color: "var(--accent-australia)" }}>
          ▬ Australia
        </span>{" "}
        highlighted against 8 peer countries in grey. Hover the chart for exact values.
      </p>
    </div>
  );
}
