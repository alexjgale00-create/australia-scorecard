import { gaugesConfig, getGaugeData } from "@/lib/gauges-data";
import {
  assertCompositeDisclosure,
  buildCompositeDisclosure,
  computeComposite,
  computeGaugeScore,
} from "@/lib/scoring";
import {
  computeMaturity,
  computeMaturityCounts,
  describeWhatsNext,
  MATURITY_TIER_LABELS,
  summarizeMaturityCounts,
} from "@/lib/maturity";
import MaturityTag from "@/components/MaturityTag";
import type { GaugeConfig, GaugeData } from "@/lib/types";

export const metadata = { title: "Data status — The Australia Scorecard" };

export default function StatusPage() {
  const counts = computeMaturityCounts(gaugesConfig.gauges, getGaugeData);
  const summary = summarizeMaturityCounts(counts);

  // Mirrors app/page.tsx exactly: gauges with no data file at all aren't
  // part of the composite calculation yet, so they can't appear in its
  // includedGaugeIds/excludedGaugeIds either — this page's own tier table
  // (below) is what discloses those, so the composite line here never
  // disagrees with what the homepage actually shows.
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
  const compositeDisclosure = buildCompositeDisclosure(
    compositeResult.excludedGaugeIds,
    scores,
    gaugesConfig.gauges
  );
  assertCompositeDisclosure(compositeResult, gaugesConfig.gauges, compositeDisclosure);

  const noFileCount = gaugesConfig.gauges.length - gaugesWithData.length;

  const rows = gaugesConfig.gauges.map((config) => {
    const data = getGaugeData(config.id);
    const maturity = computeMaturity(config, data);
    return {
      config,
      data,
      maturity,
      lastUpdate: data?.provenance.retrievedAt ? data.provenance.retrievedAt.slice(0, 10) : "—",
      whatsNext: describeWhatsNext(config, data, maturity),
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Data status</h1>
      <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">{summary}</p>

      <p className="mt-4 max-w-2xl text-sm text-[var(--text-secondary)]">
        The composite verdict on the homepage is based on {compositeResult.includedGaugeIds.length} of{" "}
        {gaugesWithData.length} gauges with a data file
        {compositeDisclosure ? ` — ${compositeDisclosure}.` : "."}{" "}
        {noFileCount > 0 &&
          `A further ${noFileCount} gauge${noFileCount === 1 ? "" : "s"} ${noFileCount === 1 ? "has" : "have"} no data file yet at all — see the Awaiting data rows below — and ${noFileCount === 1 ? "isn't" : "aren't"} yet part of this calculation either. `}
        A gauge&rsquo;s maturity tier doesn&rsquo;t otherwise gate composite inclusion — real data
        at any tier (Live, Provisional, or Established) feeds the composite once it exists; only a
        missing level score excludes a gauge, and that exclusion is always named above, never
        silent.
      </p>

      <div
        className="mt-4 max-w-2xl rounded-md border p-3 text-sm"
        style={{ borderColor: "var(--status-warning)", color: "var(--text-secondary)" }}
      >
        ⚠ Band boundaries are provisional pending full-data recalibration. — dated 2026-07-14,
        see{" "}
        <a href="/methodology" className="underline hover:text-[var(--text-primary)]">
          Methodology
        </a>
        .
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">How to read this</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {(["established", "live", "provisional", "awaiting-data"] as const).map((tier) => (
            <div key={tier} className="rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-3">
              <dt className="font-medium text-[var(--text-primary)]">{MATURITY_TIER_LABELS[tier]}</dt>
              <dd className="mt-1 text-[var(--text-secondary)]">
                {tier === "established" &&
                  "Real automated data that has survived at least one unattended scheduled refresh. The unmarked default everywhere else on the site."}
                {tier === "live" &&
                  "Real, sourced data with settled methodology — but young, carrying a disclosed gap, capped by a standing limitation, or manual-lane (which tops out here)."}
                {tier === "provisional" &&
                  "Real data, but a methodology question specific to this gauge is still open."}
                {tier === "awaiting-data" &&
                  "Configured, methodology settled, no real data yet — includes sample-data placeholders."}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Every gauge</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--gridline)]">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--gridline)] bg-[var(--surface-1)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-3 font-medium">Gauge</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Last update</th>
                <th className="px-4 py-3 font-medium">What&rsquo;s next</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ config, maturity, lastUpdate, whatsNext }) => (
                <tr key={config.id} className="border-b border-[var(--gridline)] last:border-0">
                  <td className="px-4 py-3">
                    <a href={`/gauges/${config.id}`} className="font-medium hover:underline">
                      {config.name}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {maturity.tier === "established" ? (
                      <span className="text-[var(--text-secondary)]">Established</span>
                    ) : (
                      <MaturityTag tier={maturity.tier} reason={maturity.reason} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{config.source.institution}</td>
                  <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">{lastUpdate}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{whatsNext}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
