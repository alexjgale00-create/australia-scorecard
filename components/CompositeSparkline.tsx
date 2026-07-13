"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function CompositeSparkline({
  points,
}: {
  points: { year: number; composite: number }[];
}) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Not enough historical data yet to draw a trajectory.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="compositeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-australia)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--accent-australia)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="year" hide />
        <YAxis domain={[0, 100]} hide />
        <Tooltip
          contentStyle={{
            background: "var(--surface-1)",
            borderColor: "var(--gridline)",
            fontSize: 12,
            color: "var(--text-primary)",
          }}
          formatter={(value) => [Number(value).toFixed(1), "Composite score"]}
          labelFormatter={(label) => `${label}`}
        />
        <Area
          type="monotone"
          dataKey="composite"
          stroke="var(--accent-australia)"
          strokeWidth={2.5}
          fill="url(#compositeFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
