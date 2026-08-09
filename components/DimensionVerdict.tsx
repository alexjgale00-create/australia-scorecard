import {
  assertCompositeDisclosure,
  bandForScore,
  buildCompositeDisclosure,
  computeComposite,
  computeCompositeForAllCountries,
  computeHistoricalComposite,
  computeLevelScoreDelta,
} from "@/lib/scoring";
import AnchoredSparkline from "@/components/AnchoredSparkline";
import DotStrip from "@/components/DotStrip";
import type {
  DimensionConfig,
  GaugeConfig,
  GaugeData,
  GaugeScore,
  LevelScoreDelta,
  ScoreBand,
} from "@/lib/types";

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

/**
 * One dimension's full headline treatment — band, score, context line,
 * sparkline, peer dot strip, What's Moving. Extracted from app/page.tsx so
 * Power and Quality of Life render with identical prominence side by side,
 * never one as a "main" verdict and the other as an afterthought (Phase E
 * requirement). Degrades gracefully on its own: a dimension that's mostly
 * Awaiting data (Quality of Life at launch, initially just housing-pressure)
 * still renders a real composite from whatever does have data, discloses
 * exactly what's missing, and quietly omits What's Moving when there
 * aren't enough gauges to compare.
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

  const historicalComposite = computeHistoricalComposite(gaugesWithData, dimension.id).map((p) => ({
    year: p.year,
    score: p.composite,
  }));

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
    <section className="rounded-xl border border-[var(--gridline)] bg-[var(--surface-1)] p-6 sm:p-8">
      <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {dimension.tagline}
      </p>
      <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
        {dimension.name} is{" "}
        <span className="inline-flex items-center gap-2 align-middle">
          <span
            className="inline-block h-3.5 w-3.5 rounded-full sm:h-4 sm:w-4"
            style={{ background: band?.color ?? "var(--text-muted)" }}
            aria-hidden="true"
          />
          {band?.label ?? "—"}
        </span>
      </h2>
      <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--text-secondary)]">
        {ausComposite !== null ? ausComposite.toFixed(1) : "—"}{" "}
        <span className="text-sm font-normal text-[var(--text-muted)]">/ 100</span>
      </p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        {ausRank !== null ? `${ordinal(ausRank)} of ${allComposites.length} peer countries` : "Rank unavailable"}{" "}
        · {improving} improving, {flat} flat, {deteriorating} deteriorating over the trailing decade
        {compositeDisclosure && (
          <>
            {" "}· Composite based on {includedGaugeIds.length} of {dimensionScores.length} gauges with
            data — {compositeDisclosure}.
          </>
        )}
        {noFileCount > 0 && (
          <>
            {" "}A further {noFileCount} of {totalGaugeCount} {dimension.shortName} gauge
            {totalGaugeCount === 1 ? "" : "s"} {noFileCount === 1 ? "has" : "have"} no data file yet — see{" "}
            <a href="/status" className="underline hover:text-[var(--text-primary)]">
              Data status
            </a>
            .
          </>
        )}
      </p>

      <div className="mt-5">
        <AnchoredSparkline points={historicalComposite} bands={scoreBands} size="hero" />
      </div>

      <div className="mt-5">
        <DotStrip points={allComposites} bands={scoreBands} size="hero" />
      </div>

      {showWhatsMoving &&
        (() => {
          const riserRose = riser.delta.delta > 0;
          const fallerFell = faller.delta.delta < 0;
          return (
            <div className="mt-6 border-t border-[var(--gridline)] pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                What&rsquo;s moving
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <p className="text-sm">
                  <span style={{ color: riserRose ? "var(--status-good)" : "var(--text-muted)" }}>
                    {riserRose ? "▲ Biggest riser:" : "→ Held up best:"}
                  </span>{" "}
                  <strong>{riser.config.name}</strong>,{" "}
                  {riser.delta.delta > 0 ? "+" : ""}
                  {riser.delta.delta.toFixed(1)} over {riser.delta.endYear - riser.delta.startYear} yrs
                </p>
                <p className="text-sm">
                  <span style={{ color: fallerFell ? "var(--status-critical)" : "var(--text-muted)" }}>
                    {fallerFell ? "▼ Biggest faller:" : "→ Least improved:"}
                  </span>{" "}
                  <strong>{faller.config.name}</strong>, {faller.delta.delta > 0 ? "+" : ""}
                  {faller.delta.delta.toFixed(1)} over {faller.delta.endYear - faller.delta.startYear} yrs
                </p>
              </div>
            </div>
          );
        })()}
    </section>
  );
}
