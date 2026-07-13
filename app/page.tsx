import { gaugesConfig, getGaugeData } from "@/lib/gauges-data";
import { computeComposite, computeGaugeScore, computeHistoricalComposite } from "@/lib/scoring";
import { getSiteContent } from "@/lib/content";
import GaugeCard from "@/components/GaugeCard";
import CompositeSparkline from "@/components/CompositeSparkline";
import SampleDataBadge from "@/components/SampleDataBadge";
import type { GaugeConfig, GaugeData } from "@/lib/types";

export default function Home() {
  const content = getSiteContent();

  const gaugesWithData: { config: GaugeConfig; data: GaugeData }[] = gaugesConfig.gauges
    .map((config) => {
      const data = getGaugeData(config.id);
      return data ? { config, data } : null;
    })
    .filter((g): g is { config: GaugeConfig; data: GaugeData } => g !== null);

  const scores = gaugesWithData.map(({ config, data }) =>
    computeGaugeScore(data, config, gaugesConfig.directionThresholdPctPerYear)
  );
  const { composite, improving, deteriorating, flat } = computeComposite(
    scores,
    gaugesConfig.gauges
  );
  const historicalComposite = computeHistoricalComposite(gaugesWithData);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-3">
        <SampleDataBadge />
      </div>

      <section className="rounded-xl border border-[var(--gridline)] bg-[var(--surface-1)] p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
          The verdict
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <span className="text-6xl font-bold tabular-nums text-[var(--accent-australia)]">
            {composite !== null ? composite.toFixed(1) : "—"}
          </span>
          <span className="mb-2 text-lg text-[var(--text-secondary)]">/ 100</span>
        </div>
        <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
          Composite score across {gaugesWithData.length} gauges (of 16 planned), weighted per{" "}
          <a href="/methodology" className="underline">
            gauges.config.json
          </a>
          . {improving} improving, {flat} flat, {deteriorating} deteriorating over the trailing
          decade.
        </p>

        <div className="mt-6">
          <CompositeSparkline points={historicalComposite} />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-[var(--gridline)] bg-[var(--surface-1)] p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Fact of the release
        </p>
        <h2 className="mt-1 text-xl font-semibold">{content.factOfRelease.headline}</h2>
        <p className="mt-2 text-[var(--text-secondary)]">{content.factOfRelease.body}</p>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">The gauges</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gaugesWithData.map(({ config }) => {
            const score = scores.find((s) => s.gaugeId === config.id)!;
            return <GaugeCard key={config.id} config={config} score={score} />;
          })}
        </div>
      </section>
    </div>
  );
}
