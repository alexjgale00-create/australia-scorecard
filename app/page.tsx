import { gaugesConfig, getGaugeData } from "@/lib/gauges-data";
import {
  assertCompositeDisclosure,
  bandForScore,
  buildCompositeDisclosure,
  computeComposite,
  computeCompositeForAllCountries,
  computeGaugeScore,
  computeHistoricalComposite,
  computeLevelScoreDelta,
} from "@/lib/scoring";
import { getSiteContent } from "@/lib/content";
import GaugeCard from "@/components/GaugeCard";
import AnchoredSparkline from "@/components/AnchoredSparkline";
import DotStrip from "@/components/DotStrip";
import SampleDataBadge from "@/components/SampleDataBadge";
import type { GaugeConfig, GaugeData, LevelScoreDelta } from "@/lib/types";

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

export default function Home() {
  const content = getSiteContent();

  const gaugesWithData: { config: GaugeConfig; data: GaugeData }[] = gaugesConfig.gauges
    .map((config) => {
      const data = getGaugeData(config.id);
      return data ? { config, data } : null;
    })
    .filter((g): g is { config: GaugeConfig; data: GaugeData } => g !== null);

  const scores = gaugesWithData.map(({ config, data }) =>
    computeGaugeScore(data, config, gaugesConfig.directionThresholdScorePointsPerYear)
  );
  const compositeResult = computeComposite(scores, gaugesConfig.gauges);
  const { improving, deteriorating, flat, includedGaugeIds, excludedGaugeIds } = compositeResult;
  const compositeDisclosure = buildCompositeDisclosure(excludedGaugeIds, scores, gaugesConfig.gauges);
  // Fails the build rather than let a gauge silently drop out of the composite unnoticed.
  assertCompositeDisclosure(compositeResult, gaugesConfig.gauges, compositeDisclosure);

  const allComposites = computeCompositeForAllCountries(gaugesWithData);
  const ausComposite = allComposites.find((c) => c.code === "AUS")?.score ?? null;
  const sortedByComposite = [...allComposites].sort((a, b) => b.score - a.score);
  const ausRank =
    ausComposite !== null ? sortedByComposite.findIndex((c) => c.code === "AUS") + 1 : null;
  const band = ausComposite !== null ? bandForScore(ausComposite, gaugesConfig.scoreBands) : null;

  const historicalComposite = computeHistoricalComposite(gaugesWithData).map((p) => ({
    year: p.year,
    score: p.composite,
  }));

  const deltas = gaugesWithData
    .map(({ config, data }) => {
      const score = scores.find((s) => s.gaugeId === config.id);
      if (!score || !score.latestYear) return null;
      const delta = computeLevelScoreDelta(data, config, "AUS", score.latestYear);
      return delta ? { config, delta } : null;
    })
    .filter((d): d is { config: GaugeConfig; delta: LevelScoreDelta } => d !== null)
    .sort((a, b) => b.delta.delta - a.delta.delta);

  const riser = deltas[0];
  const faller = deltas[deltas.length - 1];
  const showWhatsMoving = deltas.length >= 2 && riser.config.id !== faller.config.id;

  const sampleCount = gaugesWithData.filter(
    ({ data }) => data.provenance.status === "SAMPLE_DATA"
  ).length;
  const totalCount = gaugesWithData.length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {sampleCount > 0 && (
        <div className="mb-3">
          {sampleCount === totalCount ? (
            <SampleDataBadge />
          ) : (
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
              style={{ borderColor: "var(--status-warning)", color: "var(--text-secondary)" }}
            >
              <span aria-hidden="true">⚠</span>{" "}
              {sampleCount} of {totalCount}{" "}
              gauges below are still running on sample data — look for the &ldquo;Sample&rdquo;
              tag on each card.
            </div>
          )}
        </div>
      )}

      <section className="rounded-xl border border-[var(--gridline)] bg-[var(--surface-1)] p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
          The verdict
        </p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">
          Australia is{" "}
          <span className="inline-flex items-center gap-2.5 align-middle">
            <span
              className="inline-block h-4 w-4 rounded-full sm:h-5 sm:w-5"
              style={{ background: band?.color ?? "var(--text-muted)" }}
              aria-hidden="true"
            />
            {band?.label ?? "—"}
          </span>
        </h1>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-secondary)]">
          {ausComposite !== null ? ausComposite.toFixed(1) : "—"}{" "}
          <span className="text-base font-normal text-[var(--text-muted)]">/ 100</span>
        </p>
        <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
          {ausRank !== null ? `${ordinal(ausRank)} of ${allComposites.length} peer countries` : "Rank unavailable"}{" "}
          · {improving} improving, {flat} flat, {deteriorating} deteriorating over the trailing
          decade
          {compositeDisclosure && (
            <>
              {" "}· Composite based on {includedGaugeIds.length} of {scores.length} gauges —{" "}
              {compositeDisclosure}.
            </>
          )}
        </p>

        <div className="mt-6">
          <AnchoredSparkline
            points={historicalComposite}
            bands={gaugesConfig.scoreBands}
            size="hero"
          />
        </div>

        <div className="mt-6">
          <DotStrip points={allComposites} bands={gaugesConfig.scoreBands} size="hero" />
        </div>
      </section>

      {showWhatsMoving && (() => {
        const riserRose = riser.delta.delta > 0;
        const fallerFell = faller.delta.delta < 0;
        return (
          <section className="mt-8 rounded-xl border border-[var(--gridline)] bg-[var(--surface-1)] p-6">
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
                {faller.delta.delta.toFixed(1)} over {faller.delta.endYear - faller.delta.startYear}{" "}
                yrs
              </p>
            </div>
          </section>
        );
      })()}

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">The gauges</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gaugesWithData.map(({ config, data }) => {
            const score = scores.find((s) => s.gaugeId === config.id)!;
            return (
              <GaugeCard
                key={config.id}
                config={config}
                data={data}
                score={score}
                bands={gaugesConfig.scoreBands}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-[var(--gridline)] bg-[var(--surface-1)] p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Fact of the release
        </p>
        <h2 className="mt-1 text-xl font-semibold">{content.factOfRelease.headline}</h2>
        <p className="mt-2 text-[var(--text-secondary)]">{content.factOfRelease.body}</p>
      </section>
    </div>
  );
}
