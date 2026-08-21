"use client";

import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";

/**
 * The dimension composite's own trailing-decade trajectory — homepage
 * only (see DESIGN.md "Homepage"). Ink-only by construction (R1): the
 * line and fill are `--register-ink`/`--register-chrome`, never
 * `--accent-australia` or any other off-palette colour, since this chart
 * never encoded good/bad in the first place — it only ever meant "this is
 * Australia's own number," which the ruler above it already says without
 * needing a second colour to repeat it. No "mini" size any more: the
 * excluded sparkline-in-a-card pattern was specifically this component
 * dropped into `GaugeCard` at a shrunk size — that call site is gone, and
 * the type is trimmed to match rather than left as an unused option
 * inviting the pattern back.
 */
export default function AnchoredSparkline({
  points,
  bandBoundaries,
}: {
  points: { year: number; score: number }[];
  /** Score values the reference lines sit at — computed server-side from `ScoreBand.max`, passed as plain numbers so the deprecated `.color` field never has to be serialised into this client component's hydration payload. */
  bandBoundaries: number[];
}) {
  if (points.length < 2) {
    return (
      <p className="font-public-sans text-[13px] text-ink-3">
        Not enough historical data yet to draw a trajectory.
      </p>
    );
  }

  const start = points[0];
  const end = points[points.length - 1];

  return (
    <div>
      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="sparklineFill-ink" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--register-ink)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="var(--register-ink)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {bandBoundaries.map((y) => (
            <ReferenceLine key={y} y={y} stroke="var(--register-grid)" strokeWidth={1} ifOverflow="extendDomain" />
          ))}
          <Tooltip
            contentStyle={{
              background: "var(--register-paper)",
              border: "1px solid var(--register-chrome)",
              borderRadius: 0,
              fontSize: 11,
              fontFamily: "var(--font-martian-mono)",
              color: "var(--register-ink)",
            }}
            formatter={(value) => [Number(value).toFixed(1), "SCORE"]}
            labelStyle={{ color: "var(--register-ink-3)" }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--register-ink)"
            strokeWidth={2}
            fill="url(#sparklineFill-ink)"
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-1 flex justify-between font-martian-mono text-[10px] tabular-nums text-ink-3">
        <span>
          {start.year} · <span className="font-medium text-ink-2">{start.score.toFixed(1)}</span>
        </span>
        <span>
          {end.year} · <span className="font-medium text-ink-2">{end.score.toFixed(1)}</span>
        </span>
      </div>
    </div>
  );
}
