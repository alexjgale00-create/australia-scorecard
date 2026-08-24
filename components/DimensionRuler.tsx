import type { ScoreBand } from "@/lib/types";

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

function fmtScore(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

/**
 * At 380px the narrowest band columns (Holding: ~45px, Slipping/
 * Strengthening: ~59px) can't hold their full word at a legible size —
 * confirmed by real rendering, not assumed (see DESIGN.md "Homepage").
 * Same abbreviation instinct as the gauge page's own 380px band-column
 * spec ("FALL. BEH." for the mockup's 4-band set); this site's real
 * 5-band set has no established shorthand yet, so this is it, defined
 * once here rather than left to an ellipsis truncating mid-word.
 */
const BAND_ABBREVIATION: Record<string, string> = {
  "falling-behind": "FALL.BEH.",
  slipping: "SLIPPING",
  holding: "HOLD.",
  strengthening: "STRNGTH.",
  leading: "LEADING",
};

/**
 * REGISTER homepage — Option 2, "compact position marker." Chosen over a
 * full per-peer band strip (Option 1, reusing <Gauge>'s ScoredStrip as-is)
 * specifically because a dimension composite always carries the full
 * 8-peer set — the densest possible case for the strip's known 380px
 * collision limit (DESIGN.md's "known density limit" finding, found at
 * *lower* density than this), on the first page a visitor lands on. Full
 * reasoning in DESIGN.md's "Homepage" section.
 *
 * Same channel order as every gauge (R2): position on the ruler is
 * primary, the band word + tick glyph is secondary reinforcement, weight
 * is tertiary only — nothing here reads ScoreBand.color (R1). R3 is
 * satisfied without individually plotting peers: the summary line below
 * the ruler (rank, peer median, movement tally) is real peer context in
 * the same visual frame as the AUS mark, never behind a toggle or fold.
 * Each ruler renders its OWN dimension's `bands` prop — Power and Quality
 * of Life diverged 2026-08-24 (Phase D: separate, differently-shaped
 * achievable ranges get separate thresholds, not one shared 0-100 split).
 * This component makes no assumption the two are identical; `gridTemplate`
 * is computed fresh from whatever `bands` it's given, so the two rulers
 * can legitimately show different column widths side by side now — that's
 * divergence being visible, not a layout bug. The mark position (`score`
 * plotted on the raw 0-100 physical axis) is independent of band widths
 * either way, so "two verdicts, read against each other" still holds:
 * both scores sit on the same physical ruler, just with different
 * band-boundary paint underneath.
 */
export default function DimensionRuler({
  name,
  tagline,
  score,
  bands,
  bandLabel,
  bandTicks,
  rank,
  totalReporting,
  peerMedian,
  improving,
  flat,
  deteriorating,
}: {
  name: string;
  tagline: string;
  score: number;
  bands: ScoreBand[];
  bandLabel: string;
  bandTicks: string;
  rank: number;
  totalReporting: number;
  peerMedian: number | null;
  improving: number;
  flat: number;
  deteriorating: number;
}) {
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  const gridTemplate = sorted.map((b) => `${Math.round(((b.max - b.min + 1) / 101) * 1000) / 10}%`).join(" ");
  const markPos = Math.max(1.5, Math.min(98.5, score));

  return (
    <div className="font-public-sans text-ink">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="font-bold text-[21px] sm:text-[25px] leading-[1.15] tracking-[-.01em]">{name}</h2>
        <span className="font-martian-mono text-[11px] sm:text-[12px] font-bold tracking-[.08em] whitespace-nowrap">
          {bandLabel.toUpperCase()} {bandTicks}
        </span>
      </div>
      <p className="font-public-sans text-[13px] sm:text-[14px] text-ink-2 mt-1 mb-5">{tagline}</p>

      <div className="relative px-[2%]">
        <div
          className="relative border-t border-ink border-b border-chrome h-4"
          style={{ display: "grid", gridTemplateColumns: gridTemplate }}
        >
          {sorted.map((b, i) => (
            <div key={b.id} className={i === 0 ? "" : "border-l border-grid"} />
          ))}
          <div
            className="absolute"
            style={{ left: `${markPos}%`, top: "50%", transform: "translate(-50%, -50%)" }}
            role="img"
            aria-label={`Australia: ${fmtScore(score)} of 100, band ${bandLabel}`}
          >
            <span aria-hidden="true" className="block leading-none text-[15px]">
              ◆
            </span>
          </div>
        </div>

        <div
          className="grid font-martian-mono text-[7.5px] sm:text-[9px] font-semibold tracking-[.05em] sm:tracking-[.02em] text-ink-3 mt-1.5"
          style={{ gridTemplateColumns: gridTemplate }}
          aria-hidden="true"
        >
          {sorted.map((b) => (
            <div key={b.id} className="truncate pr-1">
              <span className="hidden sm:inline">{b.label.toUpperCase()}</span>
              <span className="sm:hidden">{BAND_ABBREVIATION[b.id] ?? b.label.toUpperCase()}</span>
            </div>
          ))}
        </div>

        <div
          className="relative font-martian-mono font-extrabold text-[15px] sm:text-[17px] tabular-nums mt-0.5"
          style={{ height: "1.3em" }}
          aria-hidden="true"
        >
          <span className="absolute" style={{ left: `${markPos}%`, transform: "translateX(-50%)" }}>
            {fmtScore(score)}
          </span>
        </div>
      </div>

      {/* R3 — peer context in the same frame as the ruler, never below a fold: rank, peer median, movement tally. */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 font-martian-mono text-[10.5px] sm:text-[11px] text-ink-2 tracking-[.02em] tabular-nums mt-2.5">
        <span className="text-ink font-bold">
          RANK {ordinal(rank)} OF {totalReporting}
        </span>
        {peerMedian !== null && <span>PEER MEDIAN {fmtScore(peerMedian)}</span>}
        <span>
          {improving} IMPROVING · {flat} FLAT · {deteriorating} DETERIORATING{" "}
          <span className="text-ink-3">(TRAILING DECADE)</span>
        </span>
      </div>
    </div>
  );
}
