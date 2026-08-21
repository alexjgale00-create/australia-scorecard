import type { TrajectoryPoint, TrajectoryView } from "@/lib/trajectory";

/**
 * REGISTER's multi-country trajectory chart — the dense layer, above the
 * AUS series table, before AUS RANK OVER TIME (see DESIGN.md "Trajectory
 * chart" for the full spec and the reasoning behind every choice below).
 *
 * Hand-rolled SVG for the lines/band, not Recharts — same precedent as
 * this file's neighbour, `RankHistoryChart` in Gauge.tsx. Terminal labels
 * are plain HTML `<span>`s absolutely positioned by percentage, not SVG
 * `<text>`: SVG text scales (and can go illegible) with a responsive
 * `viewBox`, while HTML text at a real CSS font-size doesn't — the same
 * reason DimensionRuler and PositionStrip position their marks this way
 * rather than drawing them inside an SVG. Lines use
 * `vector-effect="non-scaling-stroke"` so stroke width stays constant in
 * screen pixels regardless of the responsive viewBox scale.
 *
 * R1: ink only — `--register-ink` at full weight for AUS, lighter
 * weight/opacity and a small set of dash patterns (never colour) to keep
 * peer lines individually traceable. R7: every terminal label is an ISO
 * alpha-3 code, never a flag, never a colour-keyed legend — except
 * `FRONTIER`, deliberately not a country code, since which country holds
 * it can change from year to year (attributing it to one fixed country
 * would be false — see lib/trajectory.ts).
 */

const CHART_HEIGHT_REF_PX = 210; // the height Tailwind's h-[190px]/sm:h-[230px] splits the difference on — see DESIGN.md
const LABEL_HEIGHT_PX = 26; // two lines (ISO code + tabular value) at this component's label font size, plus a little breathing room
const LABEL_HEIGHT_PCT = (LABEL_HEIGHT_PX / CHART_HEIGHT_REF_PX) * 100; // see collision-avoidance note below `layoutLabels`

function fmtValue(n: number): string {
  if (Number.isNaN(n)) return "n.a.";
  return Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-AU") : String(Math.round(n * 100) / 100);
}

function pickYearTicks(minYear: number, maxYear: number): number[] {
  if (minYear === maxYear) return [minYear];
  const span = maxYear - minYear;
  const rawStep = span / 3;
  const step = Math.max(1, Math.round(rawStep / 5) * 5 || Math.round(rawStep));
  const ticks = [minYear];
  for (let y = minYear + step; y < maxYear; y += step) ticks.push(y);
  ticks.push(maxYear);
  return [...new Set(ticks)];
}

interface Scales {
  x: (year: number) => number;
  y: (value: number) => number;
}

function buildScales(years: number[], values: number[]): Scales {
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  return {
    x: (year) => (maxYear === minYear ? 50 : ((year - minYear) / (maxYear - minYear)) * 100),
    y: (value) => (maxVal === minVal ? 50 : 100 - ((value - minVal) / (maxVal - minVal)) * 100),
  };
}

function pathFor(points: TrajectoryPoint[], scales: Scales): string {
  return points.map((p) => `${scales.x(p.year)},${scales.y(p.value)}`).join(" ");
}

/**
 * Terminal-label collision avoidance. At most 5 labels ever reach this
 * (AUS + up to 4 named peers in the "name-all" branch; AUS + frontier +
 * comparator = 3 in "envelope" mode) — bounded by the 4-or-fewer /
 * 5-or-more branch split itself, not by anything in this function. Greedy
 * top-down pass enforcing a minimum vertical gap, then a compensating
 * pass if the bottom label would overflow past 100%. `LABEL_HEIGHT_PCT`
 * is computed against `CHART_HEIGHT_REF_PX`, a single reference height
 * rather than one calculation per breakpoint — real rendering (Playwright,
 * both 380px and desktop) is what actually confirmed this holds, not the
 * arithmetic alone; see DESIGN.md "Trajectory chart" for the verified
 * numbers.
 */
function layoutLabels<T extends { key: string; naturalY: number }>(items: T[]): (T & { y: number })[] {
  const sorted = [...items].sort((a, b) => a.naturalY - b.naturalY);
  const placed: (T & { y: number })[] = [];
  let prevY = -Infinity;
  for (const item of sorted) {
    const y = Math.max(item.naturalY, prevY + LABEL_HEIGHT_PCT);
    placed.push({ ...item, y });
    prevY = y;
  }
  const overflow = placed[placed.length - 1].y - (100 - LABEL_HEIGHT_PCT / 2);
  if (overflow > 0) {
    for (const p of placed) p.y -= overflow;
  }
  return placed;
}

function YearAxis({ years, scales }: { years: number[]; scales: Scales }) {
  const ticks = pickYearTicks(years[0], years[years.length - 1]);
  return (
    <div className="relative h-4 mt-1.5" aria-hidden="true">
      {ticks.map((year) => (
        <span
          key={year}
          className="absolute font-martian-mono text-[8.5px] sm:text-[10px] text-ink-3 tabular-nums whitespace-nowrap"
          style={{ left: `${scales.x(year)}%`, transform: xLabelTransform(scales.x(year)) }}
        >
          {year}
        </span>
      ))}
    </div>
  );
}

/** Keeps the first/last year labels from clipping past the chart's own edges — every other tick centers on its position. */
function xLabelTransform(xPct: number): string {
  if (xPct < 3) return "translateX(0%)";
  if (xPct > 97) return "translateX(-100%)";
  return "translateX(-50%)";
}

function TerminalLabel({
  x,
  y,
  code,
  value,
  weight = "normal",
}: {
  x: number;
  y: number;
  code: string;
  value: number;
  weight?: "normal" | "bold";
}) {
  // A reserved right margin alone doesn't work here: CSS resolves `left: %`
  // for an absolutely-positioned element against the *padding box* of its
  // containing block, so a label anchored at left:100% starts at the outer
  // edge and only extends *further* right from there — padding on the
  // container never actually gave it room. Found by real rendering (a
  // label clipping 12px past the 380px viewport), not assumed from the
  // box model in the abstract. Fixed the same way YearAxis's edge labels
  // already are: flip the anchor to the left of the point once it's close
  // enough to the right edge that a right-anchored label would clip.
  const clampedX = Math.max(0, Math.min(x, 100));
  const flip = clampedX > 90;
  return (
    <div
      data-terminal-label
      className="absolute font-martian-mono text-[8.5px] sm:text-[10px] leading-[1.3] tabular-nums whitespace-nowrap"
      style={{
        left: `${clampedX}%`,
        top: `${y}%`,
        transform: flip ? "translate(calc(-100% - 4px), -50%)" : "translate(4px, -50%)",
        textAlign: flip ? "right" : "left",
      }}
    >
      <div className={weight === "bold" ? "font-extrabold text-ink" : "font-medium text-ink-2"}>{code}</div>
      <div className={weight === "bold" ? "font-bold text-ink" : "text-ink-3"}>{fmtValue(value)}</div>
    </div>
  );
}

function Caption({ text }: { text: string }) {
  return (
    <p className="font-martian-mono text-[9.5px] sm:text-[10.5px] tracking-[.03em] text-ink-2 mb-2 leading-[1.6]">
      {text}
    </p>
  );
}

export default function TrajectoryChart({ view }: { view: TrajectoryView }) {
  if (view.kind === "too-thin") {
    return (
      <div className="border border-chrome p-3 sm:p-4">
        <div className="font-martian-mono text-[11px] font-medium text-stamp mb-1">
          NOT ENOUGH HISTORY FOR A TRAJECTORY
        </div>
        <div className="font-martian-mono text-[10.5px] leading-[1.7] text-ink-2 max-w-[62ch]">{view.reason}</div>
      </div>
    );
  }

  const omittedNote =
    view.omittedPeers.length > 0
      ? ` · ${view.omittedPeers.length} peer${view.omittedPeers.length === 1 ? "" : "s"} omitted, insufficient history`
      : "";

  if (view.kind === "name-all") {
    const allSeries = [view.aus, ...view.peers];
    const scales = buildScales(
      view.years,
      allSeries.flatMap((s) => s.points.map((p) => p.value))
    );
    const dashPatterns = ["none", "4 2", "1.5 2", "6 2 1.5 2"];
    const labels = layoutLabels(
      allSeries.map((s, i) => {
        const last = s.points[s.points.length - 1];
        return {
          key: s.code,
          naturalY: scales.y(last.value),
          x: scales.x(last.year), // the line's *true* endpoint — not every country necessarily reports through the same latest year
          code: s.code,
          value: last.value,
          isAus: i === 0,
        };
      })
    );

    return (
      <div>
        <Caption text={`SHOWING: AUS AND ALL ${view.peers.length} PEER${view.peers.length === 1 ? "" : "S"}${omittedNote}`} />
        <div className="relative h-[190px] sm:h-[230px]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
            {view.peers.map((p, i) => (
              <polyline
                key={p.code}
                points={pathFor(p.points, scales)}
                fill="none"
                stroke="var(--register-ink)"
                strokeOpacity={0.55}
                strokeWidth={1.25}
                strokeDasharray={dashPatterns[i % dashPatterns.length]}
                vectorEffect="non-scaling-stroke"
              >
                <title>{`${p.name}: ${fmtValue(p.points[p.points.length - 1].value)}`}</title>
              </polyline>
            ))}
            <polyline
              points={pathFor(view.aus.points, scales)}
              fill="none"
              stroke="var(--register-ink)"
              strokeWidth={2.25}
              vectorEffect="non-scaling-stroke"
            >
              <title>{`Australia: ${fmtValue(view.aus.points[view.aus.points.length - 1].value)}`}</title>
            </polyline>
          </svg>
          {labels.map((l) => (
            <TerminalLabel key={l.key} x={l.x} y={l.y} code={l.code} value={l.value} weight={l.isAus ? "bold" : "normal"} />
          ))}
        </div>
        <YearAxis years={view.years} scales={scales} />
      </div>
    );
  }

  // Envelope mode.
  const allValues = [
    ...view.aus.points.map((p) => p.value),
    ...view.frontier.map((p) => p.value),
    ...view.comparator.points.map((p) => p.value),
    ...view.band.flatMap((b) => [b.min, b.max]),
  ];
  const scales = buildScales(view.years, allValues);
  const bandPath =
    view.band.map((b) => `${scales.x(b.year)},${scales.y(b.max)}`).join(" ") +
    " " +
    [...view.band].reverse().map((b) => `${scales.x(b.year)},${scales.y(b.min)}`).join(" ");

  const comparatorLabel =
    view.comparatorSource === "precedent" ? "NAMED PEER (PRECEDENT)" : "NEAREST PEER";
  const remainingCount = Math.max(0, view.qualifyingPeerCount - 1); // every qualifying peer other than the comparator feeds the band

  const ausLast = view.aus.points[view.aus.points.length - 1];
  const frontierLast = view.frontier[view.frontier.length - 1];
  const comparatorLast = view.comparator.points[view.comparator.points.length - 1];
  const labels = layoutLabels([
    { key: "AUS", naturalY: scales.y(ausLast.value), x: scales.x(ausLast.year), code: "AUS", value: ausLast.value, isAus: true },
    {
      key: "FRONTIER",
      naturalY: scales.y(frontierLast.value),
      x: scales.x(frontierLast.year),
      code: "FRONTIER",
      value: frontierLast.value,
      isAus: false,
    },
    {
      key: view.comparator.code,
      naturalY: scales.y(comparatorLast.value),
      x: scales.x(comparatorLast.year),
      code: view.comparator.code,
      value: comparatorLast.value,
      isAus: false,
    },
  ]);

  return (
    <div>
      <Caption
        text={`SHOWING: AUS · PEER FRONTIER · ${comparatorLabel} (${view.comparator.code}) · REMAINING ${remainingCount} PEER${remainingCount === 1 ? "" : "S"} AS A RANGE${omittedNote}`}
      />
      <div className="relative h-[190px] sm:h-[230px]">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
          <polygon points={bandPath} fill="var(--register-ink)" fillOpacity={0.08} stroke="none" />
          <polyline
            points={pathFor(view.frontier, scales)}
            fill="none"
            stroke="var(--register-ink)"
            strokeOpacity={0.75}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            vectorEffect="non-scaling-stroke"
          >
            <title>{`Peer frontier: ${fmtValue(view.frontier[view.frontier.length - 1].value)}`}</title>
          </polyline>
          <polyline
            points={pathFor(view.comparator.points, scales)}
            fill="none"
            stroke="var(--register-ink)"
            strokeOpacity={0.6}
            strokeWidth={1.25}
            strokeDasharray="1.5 2"
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${view.comparator.name}: ${fmtValue(view.comparator.points[view.comparator.points.length - 1].value)}`}</title>
          </polyline>
          <polyline
            points={pathFor(view.aus.points, scales)}
            fill="none"
            stroke="var(--register-ink)"
            strokeWidth={2.25}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`Australia: ${fmtValue(view.aus.points[view.aus.points.length - 1].value)}`}</title>
          </polyline>
        </svg>
        {labels.map((l) => (
          <TerminalLabel key={l.key} x={l.x} y={l.y} code={l.code} value={l.value} weight={l.isAus ? "bold" : "normal"} />
        ))}
      </div>
      <YearAxis years={view.years} scales={scales} />
    </div>
  );
}
