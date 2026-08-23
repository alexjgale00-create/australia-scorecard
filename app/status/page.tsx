import { gaugesConfig, getGaugeData, getGaugesForDimension } from "@/lib/gauges-data";
import {
  assertCompositeDisclosure,
  buildCompositeDisclosure,
  computeComposite,
  computeGaugeScore,
  describeScoringBasis,
} from "@/lib/scoring";
import {
  computeMaturity,
  computeMaturityCounts,
  describeWhatsNext,
  latestDataYear,
  MATURITY_TIER_LABELS,
  summarizeMaturityCounts,
} from "@/lib/maturity";
import MaturityTag from "@/components/MaturityTag";
import EvidenceTag from "@/components/EvidenceTag";
import UnscoredTag from "@/components/UnscoredTag";
import type { DimensionId, GaugeConfig, GaugeData } from "@/lib/types";

export const metadata = { title: "Data status — The Australia Scorecard" };

function dimensionLabel(config: GaugeConfig): string {
  const scored = Object.keys(config.weights) as DimensionId[];
  const unscored = config.unscoredDimensions ?? [];
  const ids = [...new Set([...scored, ...unscored])];
  return ids
    .map((id) => {
      const name = gaugesConfig.dimensions.find((d) => d.id === id)?.shortName ?? id;
      return unscored.includes(id) && !scored.includes(id) ? `${name} (not scored)` : name;
    })
    .join(" + ");
}

export default function StatusPage() {
  const counts = computeMaturityCounts(gaugesConfig.gauges, getGaugeData);
  const summary = summarizeMaturityCounts(counts);

  // Mirrors app/page.tsx exactly: gauges with no data file at all aren't
  // part of any dimension's composite calculation yet, so they can't
  // appear in its includedGaugeIds/excludedGaugeIds either — this page's
  // own tier table (below) is what discloses those, so the composite lines
  // here never disagree with what the homepage actually shows.
  const gaugesWithData: { config: GaugeConfig; data: GaugeData }[] = gaugesConfig.gauges
    .map((config) => {
      const data = getGaugeData(config.id);
      return data ? { config, data } : null;
    })
    .filter((g): g is { config: GaugeConfig; data: GaugeData } => g !== null);

  const scores = gaugesWithData.map(({ config, data }) =>
    computeGaugeScore(data, config, gaugesConfig.directionThresholdScorePointsPerYear)
  );

  const reusedGauges = gaugesConfig.gauges.filter((g) => Object.keys(g.weights).length > 1);
  const unscoredGauges = gaugesConfig.gauges.filter((g) => (g.unscoredDimensions?.length ?? 0) > 0);

  const rows = gaugesConfig.gauges.map((config) => {
    const data = getGaugeData(config.id);
    const maturity = computeMaturity(config, data);
    return {
      config,
      data,
      maturity,
      // Distinct facts, both shown — never collapsed into one "as of" column
      // (CLAUDE.md's 2026-08-24 AS-OF ruling): dataThrough is what the
      // number describes, lastUpdate is when we last checked the source.
      dataThrough: latestDataYear(data),
      lastUpdate: data?.provenance.retrievedAt ? data.provenance.retrievedAt.slice(0, 10) : "—",
      whatsNext: describeWhatsNext(config, data, maturity),
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Data status</h1>
      <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">{summary}</p>
      <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
        {gaugesConfig.gauges.length} unique gauges across two dimensions —{" "}
        {getGaugesForDimension("power").length} in Power, {getGaugesForDimension("quality-of-life").length}{" "}
        in Quality of Life
        {unscoredGauges.length > 0 && (
          <>
            {" "}
            ({unscoredGauges.length} of which — {unscoredGauges.map((g) => g.name).join(", ")} — appears
            with real data but isn&rsquo;t scored — see &ldquo;Unscored gauges&rdquo; below)
          </>
        )}
        {reusedGauges.length > 0 && (
          <>
            , {reusedGauges.length} of which ({reusedGauges.map((g) => g.name).join(", ")}) is scored in
            both — see &ldquo;Reused gauges&rdquo; below
          </>
        )}
        .
      </p>

      <div
        className="mt-4 max-w-2xl rounded-md border p-3 text-sm"
        style={{ borderColor: "var(--status-warning)", color: "var(--text-secondary)" }}
      >
        ⚠ Band boundaries are provisional pending full-data recalibration, and now apply to both
        dimensions equally. — dated 2026-07-14, extended 2026-08 (Phase E). See{" "}
        <a href="/methodology" className="underline hover:text-[var(--text-primary)]">
          Methodology
        </a>
        .
      </div>

      {gaugesConfig.dimensions.map((dimension) => {
        // Scored gauges only — an unscored gauge (real data, deliberately
        // excluded) must never count toward "no data file yet", the same
        // distinction DimensionVerdict on the homepage makes.
        const scoredDimensionGauges = getGaugesForDimension(dimension.id).filter(
          (g) => g.weights[dimension.id] !== undefined
        );
        const dimensionGaugesWithData = gaugesWithData.filter(
          (g) => g.config.weights[dimension.id] !== undefined
        );
        const dimensionScores = scores.filter((s) =>
          dimensionGaugesWithData.some((g) => g.config.id === s.gaugeId)
        );
        const compositeResult = computeComposite(dimensionScores, gaugesConfig.gauges, dimension.id);
        const compositeDisclosure = buildCompositeDisclosure(
          compositeResult.excludedGaugeIds,
          dimensionScores,
          gaugesConfig.gauges
        );
        assertCompositeDisclosure(compositeResult, gaugesConfig.gauges, compositeDisclosure);
        const noFileCount = scoredDimensionGauges.length - dimensionGaugesWithData.length;

        return (
          <p key={dimension.id} className="mt-4 max-w-2xl text-sm text-[var(--text-secondary)]">
            <strong>{dimension.name}:</strong> the composite verdict is based on{" "}
            {compositeResult.includedGaugeIds.length} of {dimensionGaugesWithData.length} gauges with a
            data file{compositeDisclosure ? ` — ${compositeDisclosure}.` : "."}{" "}
            {noFileCount > 0 &&
              `A further ${noFileCount} gauge${noFileCount === 1 ? "" : "s"} ${noFileCount === 1 ? "has" : "have"} no data file yet at all — see the Awaiting data rows below — and ${noFileCount === 1 ? "isn't" : "aren't"} yet part of this calculation either. `}
          </p>
        );
      })}
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
        A gauge&rsquo;s maturity tier doesn&rsquo;t otherwise gate composite inclusion — real data at
        any tier (Live, Provisional, or Established) feeds its composite(s) once it exists; only a
        missing level score excludes a gauge, and that exclusion is always named above, never silent.
      </p>

      {unscoredGauges.length > 0 && (
        <section className="mt-8 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
          <h2 className="mb-2 text-lg font-semibold">Unscored gauges</h2>
          <p className="mb-3 text-sm text-[var(--text-secondary)]">
            Appears on its dimension&rsquo;s page with real data, but deliberately excluded from that
            dimension&rsquo;s composite — not the same as &ldquo;awaiting data&rdquo;, which means
            nothing has landed yet. This means real data exists and a scoring decision was made
            against it.
          </p>
          {unscoredGauges.map((g) => (
            <div key={g.id}>
              <p className="text-sm font-medium">
                <a href={`/gauges/${g.id}`} className="hover:underline">
                  {g.name}
                </a>
              </p>
              {g.unscoredReason && <p className="mt-1 text-sm text-[var(--text-secondary)]">{g.unscoredReason}</p>}
            </div>
          ))}
        </section>
      )}

      {reusedGauges.length > 0 && (
        <section className="mt-8 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
          <h2 className="mb-2 text-lg font-semibold">Reused gauges</h2>
          {reusedGauges.map((g) => (
            <div key={g.id}>
              <p className="text-sm font-medium">
                <a href={`/gauges/${g.id}`} className="hover:underline">
                  {g.name}
                </a>{" "}
                — scored in both Power ({((g.weights.power ?? 0) * 100).toFixed(1)}% weight) and Quality
                of Life ({((g.weights["quality-of-life"] ?? 0) * 100).toFixed(1)}% weight)
              </p>
              {g.reuseNote && <p className="mt-1 text-sm text-[var(--text-secondary)]">{g.reuseNote}</p>}
            </div>
          ))}
        </section>
      )}

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
        <div className="mt-3 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-3 text-sm">
          <p className="font-medium text-[var(--text-primary)]">Direction: &ldquo;Insufficient history&rdquo;</p>
          <p className="mt-1 text-[var(--text-secondary)]">
            Shown instead of an improving/flat/deteriorating arrow when a gauge has real data but too
            few waves, spaced too irregularly, to trust a computed trend from — currently only reachable
            on gauges scored &ldquo;latest-wave-per-country&rdquo; (see below). Distinct from both
            &ldquo;Flat&rdquo; (a real trend was computed and it&rsquo;s small) and the italic &ldquo;No
            trend data&rdquo; (no comparable data exists at all).
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Every gauge</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--gridline)]">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--gridline)] bg-[var(--surface-1)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-3 font-medium">Gauge</th>
                <th className="px-4 py-3 font-medium">Dimension</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Data through</th>
                <th className="px-4 py-3 font-medium">Retrieved</th>
                <th className="px-4 py-3 font-medium">What&rsquo;s next</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ config, maturity, dataThrough, lastUpdate, whatsNext }) => {
                const scoringBasisNote = describeScoringBasis(config);
                return (
                  <tr key={config.id} className="border-b border-[var(--gridline)] last:border-0">
                    <td className="px-4 py-3">
                      <a href={`/gauges/${config.id}`} className="font-medium hover:underline">
                        {config.name}
                      </a>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <EvidenceTag strength={config.evidenceStrength} />
                        {(config.unscoredDimensions?.length ?? 0) > 0 && <UnscoredTag />}
                        {scoringBasisNote && (
                          <span
                            className="rounded border border-[var(--gridline)] px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--text-muted)]"
                            title={scoringBasisNote}
                          >
                            Latest-wave basis
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{dimensionLabel(config)}</td>
                    <td className="px-4 py-3">
                      {maturity.tier === "established" ? (
                        <span className="text-[var(--text-secondary)]">Established</span>
                      ) : (
                        <MaturityTag tier={maturity.tier} reason={maturity.reason} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{config.source.institution}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">{dataThrough ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--text-secondary)]">{lastUpdate}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{whatsNext}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
