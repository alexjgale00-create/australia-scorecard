import type { GaugeTermStat } from "@/lib/government-performance";

/**
 * One gauge×government cell in the government-performance detail table.
 * Shows two of the three published statistics per cell (annualised change,
 * end-of-term level) — "net improving/declining" is a row-and-column
 * aggregate, not a per-gauge property, so it's shown only in the rollup
 * table above this one; a reader can still eyeball it here as the count of
 * ▲/▼ glyphs across a row.
 *
 * Three states, and per the memo's ruling, the first must be visually
 * distinct from the second at a glance, not merely labelled differently —
 * a reader scanning a row for absences must not be able to mistake three
 * blank gauges for three bad results:
 *
 * - ENTIRELY ABSENT (no observation in the term at all): DESIGN.md's
 *   existing "n.a. in --stamp, never —, never blank, never 0" convention,
 *   PLUS a diagonal hatch fill in --grid — a structural/textural
 *   difference, not a colour-as-performance one (R1). The hatch is what
 *   makes a scanned row's absences pop out even before the "n.a." text
 *   registers; stamp colour alone (already used for ordinary staleness/
 *   absence marks elsewhere) wasn't judged distinct enough on its own for
 *   a dense multi-column table meant to be read at a glance.
 * - SINGLE OBSERVATION (data exists, but no change can be stated): the
 *   term's one real level score, shown plain with a dagger, never
 *   silently identical in appearance to a computed decline of exactly
 *   zero.
 * - COMPUTED (≥2 observations): the real annualised rate with a direction
 *   glyph first (R2 — position/glyph before weight, never colour), plus
 *   the end-of-term level as a smaller secondary line.
 */
export default function GovTermCell({
  stat,
  thresholdScorePointsPerYear,
}: {
  stat: GaugeTermStat | null;
  /** Same basis as the rollup table and the rest of the site's direction classification (gaugesConfig.directionThresholdScorePointsPerYear) — never a threshold invented for this cell. */
  thresholdScorePointsPerYear: number;
}) {
  if (!stat) {
    return (
      <td
        className="py-2 px-2.5 text-center align-middle"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--color-grid) 0px, var(--color-grid) 1.5px, transparent 1.5px, transparent 7px)",
        }}
      >
        <span className="font-martian-mono text-[11px] font-bold text-stamp">n.a.</span>
      </td>
    );
  }

  if (stat.deltaScore === null || stat.annualized === null) {
    return (
      <td className="py-2 px-2.5 text-center align-middle bg-paper">
        <span
          className="font-martian-mono text-[11px] text-ink-2"
          title={`Single observation, ${stat.firstYear} — no change can be stated`}
        >
          {stat.endLevel.toFixed(1)}†
        </span>
      </td>
    );
  }

  const glyph =
    stat.annualized > thresholdScorePointsPerYear
      ? "▲"
      : stat.annualized < -thresholdScorePointsPerYear
        ? "▼"
        : "•";

  return (
    <td className="py-2 px-2.5 text-center align-middle bg-paper">
      <div className="font-martian-mono text-[11.5px] font-semibold text-ink tabular-nums">
        <span className="mr-1 text-[9px] align-middle">{glyph}</span>
        {stat.annualized.toFixed(2)}
      </div>
      <div className="font-martian-mono text-[9.5px] text-ink-2 tabular-nums mt-0.5">→ {stat.endLevel.toFixed(1)}</div>
    </td>
  );
}
