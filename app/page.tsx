import { gaugesConfig, getGaugeData, getGaugesForDimension, isScoredInDimension } from "@/lib/gauges-data";
import { computeGaugeScore } from "@/lib/scoring";
import { getSiteContent } from "@/lib/content";
import GaugeCard from "@/components/GaugeCard";
import AwaitingDataCard from "@/components/AwaitingDataCard";
import UnscoredGaugeCard from "@/components/UnscoredGaugeCard";
import DimensionVerdict from "@/components/DimensionVerdict";
import { computeMaturityCounts, summarizeMaturityCounts } from "@/lib/maturity";
import type { GaugeConfig, GaugeData } from "@/lib/types";

export default function Home() {
  const content = getSiteContent();

  const gaugesWithData: { config: GaugeConfig; data: GaugeData }[] = gaugesConfig.gauges
    .map((config) => {
      const data = getGaugeData(config.id);
      return data ? { config, data } : null;
    })
    .filter((g): g is { config: GaugeConfig; data: GaugeData } => g !== null);

  // Computed once across every gauge with data, regardless of dimension —
  // both DimensionVerdicts below filter this same array to their own gauges
  // rather than each recomputing scores from scratch.
  const scores = gaugesWithData.map(({ config, data }) =>
    computeGaugeScore(data, config, gaugesConfig.directionThresholdScorePointsPerYear)
  );

  const maturityCounts = computeMaturityCounts(gaugesConfig.gauges, getGaugeData);
  const maturitySummary = summarizeMaturityCounts(maturityCounts);
  const allEstablished = maturityCounts.established === gaugesConfig.gauges.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {!allEstablished && (
        <div className="mb-3">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
            style={{ borderColor: "var(--status-warning)", color: "var(--text-secondary)" }}
          >
            <span aria-hidden="true">⚠</span>{" "}
            {maturitySummary} See{" "}
            <a href="/status" className="underline hover:text-[var(--text-primary)]">
              Data status
            </a>
            .
          </div>
        </div>
      )}

      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Two independent verdicts, never combined into one number — the tension between them is
        the point. See{" "}
        <a href="/methodology" className="underline hover:text-[var(--text-primary)]">
          Methodology
        </a>{" "}
        for how each is built.
      </p>

      {/* Equal prominence, side by side; stacks on mobile. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {gaugesConfig.dimensions.map((dimension) => (
          <DimensionVerdict
            key={dimension.id}
            dimension={dimension}
            gaugesWithData={gaugesWithData}
            scores={scores}
            allConfigs={gaugesConfig.gauges}
            scoreBands={gaugesConfig.scoreBands}
            totalGaugeCount={
              getGaugesForDimension(dimension.id).filter((g) => isScoredInDimension(g, dimension.id))
                .length
            }
          />
        ))}
      </div>

      {gaugesConfig.dimensions.map((dimension) => {
        const dimensionGauges = getGaugesForDimension(dimension.id);
        return (
          <section key={dimension.id} className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">
              {dimension.name} gauges
              <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
                {dimension.tagline}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dimensionGauges.map((config) => {
                const withData = gaugesWithData.find((g) => g.config.id === config.id);
                if (config.unscoredDimensions?.includes(dimension.id)) {
                  return (
                    <UnscoredGaugeCard key={config.id} config={config} data={withData?.data ?? null} />
                  );
                }
                if (!withData) return <AwaitingDataCard key={config.id} config={config} />;
                const score = scores.find((s) => s.gaugeId === config.id)!;
                return (
                  <GaugeCard
                    key={config.id}
                    config={withData.config}
                    data={withData.data}
                    score={score}
                    bands={gaugesConfig.scoreBands}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

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
