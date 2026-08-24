import {
  assertCompositeDisclosure,
  bandForScore,
  buildCompositeDisclosure,
  computeBoundaryProximity,
  computeComposite,
  computeCompositeForAllCountries,
  computeHistoricalComposite,
  computeLevelScoreDelta,
  medianAbsoluteAnnualMove,
  proximityCompact,
  proximitySentence,
} from "@/lib/scoring";
import AnchoredSparkline from "@/components/AnchoredSparkline";
import DimensionRuler from "@/components/DimensionRuler";
import type {
  DimensionConfig,
  GaugeConfig,
  GaugeData,
  GaugeScore,
  LevelScoreDelta,
  ScoreBand,
} from "@/lib/types";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * One dimension's full headline treatment — REGISTER, Option 2 ("compact
 * position marker" — see DimensionRuler and DESIGN.md "Homepage" for the
 * full argument against the full band-strip alternative). Extracted from
 * app/page.tsx so Power and Quality of Life render with identical
 * prominence side by side, never one as a "main" verdict and the other as
 * an afterthought (Phase E requirement). Degrades gracefully on its own: a
 * dimension that's mostly Awaiting data still renders a real composite
 * from whatever does have data, discloses exactly what's missing, and
 * quietly omits What's Moving when there aren't enough gauges to compare.
 *
 * Zero colour encodes performance anywhere in this component (R1) — no
 * `ScoreBand.color` read here (the standing rule this component used to be
 * the one exception to), no `--accent-australia`, no `--status-good`/
 * `--status-warning`/`--status-critical`. Direction in WHAT'S MOVING is
 * carried by glyph + weight only (R2's tertiary channel), never colour.
 */
export default function DimensionVerdict({
  dimension,
  gaugesWithData,
  scores,
  allConfigs,
  scoreBands,
  totalGaugeCount,
}: {
  dimension: DimensionConfig;
  /** All gauges with a data file, across every dimension — this component filters to its own. */
  gaugesWithData: { config: GaugeConfig; data: GaugeData }[];
  /** Scores for every gauge in gaugesWithData — this component filters to its own. */
  scores: GaugeScore[];
  allConfigs: GaugeConfig[];
  scoreBands: ScoreBand[];
  /** Total gauges configured for this dimension, with or without a data file yet — for the "N further gauges awaiting data" disclosure. */
  totalGaugeCount: number;
}) {
  const inDimension = gaugesWithData.filter(({ config }) => config.weights[dimension.id] !== undefined);
  const dimensionScores = scores.filter((s) => inDimension.some((g) => g.config.id === s.gaugeId));

  const compositeResult = computeComposite(dimensionScores, allConfigs, dimension.id);
  const { improving, deteriorating, flat, includedGaugeIds, excludedGaugeIds } = compositeResult;
  const compositeDisclosure = buildCompositeDisclosure(excludedGaugeIds, dimensionScores, allConfigs);
  // Fails the build rather than let a gauge silently drop out of this dimension's composite unnoticed.
  assertCompositeDisclosure(compositeResult, allConfigs, compositeDisclosure);

  const allComposites = computeCompositeForAllCountries(gaugesWithData, dimension.id);
  const ausComposite = allComposites.find((c) => c.code === "AUS")?.score ?? null;
  const sortedByComposite = [...allComposites].sort((a, b) => b.score - a.score);
  const ausRank =
    ausComposite !== null ? sortedByComposite.findIndex((c) => c.code === "AUS") + 1 : null;
  const band = ausComposite !== null ? bandForScore(ausComposite, scoreBands) : null;
  const peerMedian = median(allComposites.filter((c) => c.code !== "AUS").map((c) => c.score));

  const { points: historicalPoints, excludedYears } = computeHistoricalComposite(gaugesWithData, dimension.id);
  const historicalComposite = historicalPoints.map((p) => ({
    year: p.year,
    score: p.composite,
  }));

  // Resolution disclosure, not a volatility warning (ruled 2026-08-24):
  // states plainly when this dimension's own instrument can't cleanly
  // separate a country from whatever sits just across a boundary from it
  // — "close" meaning within one typical year's movement, always computed
  // from this dimension's own historical series, never a fixed number.
  // Grouped by boundary: two or more countries straddling the same line is
  // a real property of the peer distribution (found on Quality of Life —
  // 4 of 9 cluster around Strengthening/Leading), not something a looser
  // threshold should hide. Australia's group (solo or clustered) renders
  // with the ruler; every other group renders beneath it.
  const medianAnnualMove = medianAbsoluteAnnualMove(historicalPoints);
  const proximityGroups = medianAnnualMove !== null ? computeBoundaryProximity(allComposites, scoreBands, medianAnnualMove) : [];
  const ausProximityGroup = proximityGroups.find((g) => g.countries.some((c) => c.code === "AUS"));
  const peerProximityGroups = proximityGroups.filter((g) => g !== ausProximityGroup);

  const noFileCount = totalGaugeCount - inDimension.length;

  const deltas = inDimension
    .map(({ config, data }) => {
      const score = dimensionScores.find((s) => s.gaugeId === config.id);
      if (!score || !score.latestYear) return null;
      const delta = computeLevelScoreDelta(data, config, "AUS", score.latestYear);
      return delta ? { config, delta } : null;
    })
    .filter((d): d is { config: GaugeConfig; delta: LevelScoreDelta } => d !== null)
    .sort((a, b) => b.delta.delta - a.delta.delta);

  const riser = deltas[0];
  const faller = deltas[deltas.length - 1];
  const showWhatsMoving = deltas.length >= 2 && riser.config.id !== faller.config.id;

  return (
    <section className="border border-chrome bg-paper p-6 sm:p-8">
      {ausComposite !== null && band !== null && ausRank !== null ? (
        <DimensionRuler
          name={dimension.name}
          tagline={dimension.tagline}
          score={ausComposite}
          bands={scoreBands}
          bandLabel={band.label}
          bandTicks={band.ticks}
          rank={ausRank}
          totalReporting={allComposites.length}
          peerMedian={peerMedian}
          improving={improving}
          flat={flat}
          deteriorating={deteriorating}
        />
      ) : null}

      {ausComposite !== null && band !== null && ausRank !== null && (ausProximityGroup || peerProximityGroups.length > 0) && (
        <div className="font-martian-mono text-[9.5px] text-ink-3 mt-2 space-y-1">
          {ausProximityGroup && <p>{proximitySentence(ausProximityGroup)}</p>}
          {peerProximityGroups.map((g) => (
            <p key={g.boundary}>{g.countries.length === 1 ? proximityCompact(g) : proximitySentence(g)}</p>
          ))}
        </div>
      )}

      {ausComposite === null && (
        <div className="font-public-sans text-ink">
          <h2 className="font-bold text-[21px] sm:text-[25px] leading-[1.15] tracking-[-.01em]">
            {dimension.name}
          </h2>
          <p className="font-martian-mono text-[12px] font-medium text-stamp mt-2">
            NO COMPOSITE YET — no gauge in this dimension has data.
          </p>
        </div>
      )}

      <p className="font-martian-mono text-[10.5px] sm:text-[11px] text-ink-2 tracking-[.02em] mt-3">
        {compositeDisclosure && <>{includedGaugeIds.length} OF {dimensionScores.length} GAUGES WITH DATA — {compositeDisclosure.toUpperCase()}. </>}
        {noFileCount > 0 && (
          <>
            A FURTHER {noFileCount} OF {totalGaugeCount} {dimension.shortName.toUpperCase()} GAUGE
            {totalGaugeCount === 1 ? "" : "S"} {noFileCount === 1 ? "HAS" : "HAVE"} NO DATA FILE YET — SEE{" "}
            <a href="/status" className="underline decoration-chrome hover:decoration-ink">
              DATA STATUS
            </a>
            .
          </>
        )}
      </p>

      <div className="mt-6 border-t border-grid pt-5">
        {/* "COMPOSITE TRAJECTORY", not "TRAILING DECADE — ..." (fixed
            2026-08-25): this chart has shown full history since Phase A's
            first commit, never a 10-year window — "TRAILING DECADE" was
            introduced here during the REGISTER rebuild by mistakenly
            reusing the phrase that correctly describes the IMPROVING/FLAT/
            DETERIORATING tally on DimensionRuler (a genuine 10-year window,
            trailingStartYear's windowYears=10) for this unrelated, never-
            windowed chart. No date range in the heading either — AnchoredSparkline's
            own footer already prints the real start/end year and value, and
            a heading duplicating that would go stale every time the series
            grows. See HANDOVER.md and METHODOLOGY.md for the full record. */}
        <p className="font-martian-mono text-[9.5px] font-bold tracking-[.14em] text-ink-3 mb-2">
          COMPOSITE TRAJECTORY
        </p>
        <AnchoredSparkline
          points={historicalComposite}
          bandBoundaries={scoreBands.slice(0, -1).map((b) => b.max + 0.5)}
        />
        {excludedYears.length > 0 && (
          <p className="font-martian-mono text-[9.5px] text-ink-3 mt-1.5">
            {excludedYears.length === 1
              ? `${excludedYears[0]} excluded`
              : `${excludedYears[0]}–${excludedYears[excludedYears.length - 1]} excluded`}{" "}
            — too few of this dimension&rsquo;s gauges have reached that year yet for a
            representative reading. Today&rsquo;s composite above already reflects every gauge
            at its own latest year regardless.
          </p>
        )}
      </div>

      {showWhatsMoving &&
        (() => {
          const riserRose = riser.delta.delta > 0;
          const fallerFell = faller.delta.delta < 0;
          return (
            <div className="mt-6 border-t border-grid pt-5">
              <p className="font-martian-mono text-[9.5px] font-bold tracking-[.14em] text-ink-3 mb-3">
                WHAT&rsquo;S MOVING
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 font-public-sans text-[13.5px] text-ink">
                <p>
                  <span className={`font-martian-mono text-[11px] ${riserRose ? "font-bold" : ""} text-ink`}>
                    {riserRose ? "▲ BIGGEST RISER:" : "→ HELD UP BEST:"}
                  </span>{" "}
                  <strong className="font-semibold">{riser.config.name}</strong>,{" "}
                  <span className="tabular-nums">
                    {riser.delta.delta > 0 ? "+" : ""}
                    {riser.delta.delta.toFixed(1)}
                  </span>{" "}
                  over {riser.delta.endYear - riser.delta.startYear} yrs
                </p>
                <p>
                  <span className={`font-martian-mono text-[11px] ${fallerFell ? "font-bold" : ""} text-ink`}>
                    {fallerFell ? "▼ BIGGEST FALLER:" : "→ LEAST IMPROVED:"}
                  </span>{" "}
                  <strong className="font-semibold">{faller.config.name}</strong>,{" "}
                  <span className="tabular-nums">
                    {faller.delta.delta > 0 ? "+" : ""}
                    {faller.delta.delta.toFixed(1)}
                  </span>{" "}
                  over {faller.delta.endYear - faller.delta.startYear} yrs
                </p>
              </div>
            </div>
          );
        })()}
    </section>
  );
}
