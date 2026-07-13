"use client";

import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import type { ScoreBand } from "@/lib/types";

type Size = "hero" | "mini";

export default function AnchoredSparkline({
  points,
  bands,
  size = "hero",
}: {
  points: { year: number; score: number }[];
  bands: ScoreBand[];
  size?: Size;
}) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Not enough historical data yet to draw a trajectory.
      </p>
    );
  }

  const height = size === "hero" ? 130 : 56;
  const boundaries = bands.slice(0, -1).map((b) => b.max + 0.5);
  const start = points[0];
  const end = points[points.length - 1];
  const labelSize = size === "hero" ? "text-xs" : "text-[0.65rem]";

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={`sparklineFill-${size}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-australia)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--accent-australia)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {boundaries.map((y) => (
            <ReferenceLine key={y} y={y} stroke="var(--gridline)" strokeWidth={1} ifOverflow="extendDomain" />
          ))}
          {size === "hero" && (
            <Tooltip
              contentStyle={{
                background: "var(--surface-1)",
                borderColor: "var(--gridline)",
                fontSize: 12,
                color: "var(--text-primary)",
              }}
              formatter={(value) => [Number(value).toFixed(1), "Score"]}
            />
          )}
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--accent-australia)"
            strokeWidth={2.5}
            fill={`url(#sparklineFill-${size})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className={`mt-1 flex justify-between ${labelSize} text-[var(--text-muted)]`}>
        <span>
          {start.year} · <span className="font-medium text-[var(--text-secondary)]">{start.score.toFixed(1)}</span>
        </span>
        <span>
          {end.year} · <span className="font-medium text-[var(--text-secondary)]">{end.score.toFixed(1)}</span>
        </span>
      </div>
    </div>
  );
}
