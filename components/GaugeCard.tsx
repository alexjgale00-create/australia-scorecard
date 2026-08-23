import Link from "next/link";
import type { ScoredGauge } from "@/lib/gauge-view";

/**
 * The homepage grid card for a scored gauge — REGISTER, built directly off
 * `buildGaugeView`'s `ScoredGauge` (the same view model `/table/[plate]`
 * and `/section/[n]` already trust), so the band word, tick glyph, rank,
 * and delta here can never drift from what the gauge's own page says.
 *
 * R1: no colour encodes anything — no `--accent-australia` score, no
 * `DirectionArrow`, no coloured `DotStrip`. R2: peer position (ink ticks +
 * `◆`, the same convention `/section/[n]`'s PositionStrip already uses) is
 * primary, band word + tick glyph secondary, weight tertiary only. R7:
 * ISO alpha-3 in mono, no flags — inherited from `view.peers`. R8: plate
 * number shown, links straight to `/table/[plate]` — not the retired
 * `/gauges/[slug]` redirect. Zero border radius throughout.
 */
export default function GaugeCard({ view, plate }: { view: ScoredGauge; plate: string }) {
  return (
    <Link
      href={`/table/${plate}`}
      className="block border border-chrome bg-paper p-4 font-public-sans text-ink transition hover:border-ink"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 font-martian-mono text-[11px] font-bold tracking-[.08em]">
          <span>{plate}</span>
        </div>
        {view.isSampleData && (
          <span className="font-martian-mono text-[8.5px] font-bold tracking-[.1em] border border-stamp text-stamp px-[5px] py-[1px] whitespace-nowrap">
            SAMPLE
          </span>
        )}
      </div>

      <h3 className="font-semibold text-[15px] leading-[1.25] mt-1.5">{view.title}</h3>

      <div className="font-martian-mono text-[10.5px] font-bold tracking-[.04em] tabular-nums mt-2.5">
        {view.bands.find((b) => b.key === view.ausBand)?.label.toUpperCase()}{" "}
        {view.bands.find((b) => b.key === view.ausBand)?.ticks}
      </div>

      <div className="relative h-3.5 border-l border-r border-chrome mt-2.5">
        {view.peers.map((p) => (
          <span
            key={p.code}
            className="absolute w-[2px] h-2 bg-ink opacity-35"
            style={{ left: `${p.score}%`, top: 3 }}
            title={`${p.name}: ${Math.round(p.score)}`}
          />
        ))}
        {/* Ghost mark (Option A — see DESIGN.md "Homepage gauge card — ghost
            mark"): Australia's own peer-relative position at the delta
            window's start year, so the delta text's magnitude reads as
            displacement on the same scale the current mark already uses.
            Wrapped with its own role="img" + combined aria-label — the
            displacement is the information, so the accessible name states
            both positions and both years, not just the current one. Peer
            ticks above keep their own individual titles, untouched. */}
        <div
          className="absolute inset-0"
          role="img"
          aria-label={
            view.deltaStartScore !== null && view.deltaStartYear !== null && view.deltaEndYear !== null
              ? `Australia: ${Math.round(view.deltaStartScore)} of 100 in ${view.deltaStartYear}, ${Math.round(view.aus.score)} of 100 in ${view.deltaEndYear}`
              : `Australia: ${Math.round(view.aus.score)} of 100`
          }
        >
          {view.deltaStartScore !== null && (
            <span
              className="absolute h-px bg-chrome"
              style={{
                left: `${Math.min(view.deltaStartScore, view.aus.score)}%`,
                width: `${Math.abs(view.aus.score - view.deltaStartScore)}%`,
                top: 6,
              }}
              aria-hidden="true"
            />
          )}
          {view.deltaStartScore !== null && (
            <span
              className="absolute text-[9px] leading-none opacity-50"
              style={{ left: `${view.deltaStartScore}%`, top: 0, transform: "translateX(-50%)" }}
              aria-hidden="true"
            >
              ◇
            </span>
          )}
          <span
            className="absolute text-[9px] leading-none"
            style={{ left: `${view.aus.score}%`, top: 0, transform: "translateX(-50%)" }}
            aria-hidden="true"
          >
            ◆
          </span>
        </div>
      </div>

      <div className="font-martian-mono text-[10px] text-ink-2 tracking-[.03em] tabular-nums mt-2">
        RANK {view.rank} · {view.delta}
      </div>

      {/* DATA THROUGH — the observation year, not the retrieval date (see
          CLAUDE.md's 2026-08-24 AS-OF ruling); the retrieval date is one tap
          away on the gauge's own table page, surfaced here only as a title
          tooltip so the compact card states the one fact that answers "how
          current is this" without conflating it with a second one. */}
      <div
        className={`font-martian-mono text-[9.5px] mt-1 ${view.stale ? "text-stamp" : "text-ink-3"}`}
        title={`Retrieved ${view.asOf}`}
      >
        DATA THROUGH {view.dataThroughYear ?? "—"}
        {view.stale ? " · STALE" : ""}
      </div>
    </Link>
  );
}
