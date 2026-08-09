import { notFound } from "next/navigation";
import { gaugesConfig, getAllGaugeIds, getGaugeConfig, getGaugeData } from "@/lib/gauges-data";
import {
  computeGaugeScore,
  computeLevelScoreForAllCountries,
  computeLevelScoreForAllCountriesLatestWave,
  computePeerRelativeTrend,
  computeRawValueTrend,
  describeScoringBasis,
  describeTwoWaysToRead,
} from "@/lib/scoring";
import { getWhyThisMatters } from "@/lib/content";
import TimeSeriesChart from "@/components/TimeSeriesChart";
import RankChart from "@/components/RankChart";
import DirectionArrow from "@/components/DirectionArrow";
import SourceFooter from "@/components/SourceFooter";
import SampleDataBadge from "@/components/SampleDataBadge";
import DotStrip from "@/components/DotStrip";
import MaturityTag from "@/components/MaturityTag";
import EvidenceTag from "@/components/EvidenceTag";
import { computeMaturity, describeMaturityTier, describeWhatsNext, manualStaleness } from "@/lib/maturity";
import type { DimensionId } from "@/lib/types";

export function generateStaticParams() {
  return getAllGaugeIds().map((slug) => ({ slug }));
}

export default async function GaugeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getGaugeConfig(slug);
  const data = getGaugeData(slug);

  if (!config) notFound();

  const dimensionIds = Object.keys(config.weights) as DimensionId[];
  const dimensionNames = dimensionIds
    .map((id) => gaugesConfig.dimensions.find((d) => d.id === id)?.name ?? id)
    .join(" + ");

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-[var(--text-muted)]">
          {config.unit} · {dimensionNames}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold">{config.name}</h1>
          <MaturityTag tier="awaiting-data" reason={null} />
          <EvidenceTag strength={config.evidenceStrength} />
        </div>
        <div className="mt-6 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-6">
          <p className="font-semibold text-[var(--text-primary)]">
            This gauge is configured but doesn&rsquo;t have data yet.
          </p>
          {config.accessType === "manual" ? (
            <p className="mt-2 break-words text-[var(--text-secondary)]">
              It&rsquo;s in the manual data lane — sourced from{" "}
              <a href={config.source.url} className="underline" target="_blank" rel="noreferrer">
                {config.source.institution}
              </a>{" "}
              ({config.source.seriesId}), but no one has entered its first real numbers yet. There is
              no automated pipeline for this gauge to run — see{" "}
              <code className="rounded bg-[var(--page-plane)] px-1.5 py-0.5 text-sm">
                data/manual/README.md
              </code>{" "}
              for the download template and instructions.
            </p>
          ) : (
            <p className="mt-2 break-words text-[var(--text-secondary)]">
              It&rsquo;s set up to fetch from{" "}
              <a href={config.source.url} className="underline" target="_blank" rel="noreferrer">
                {config.source.institution}
              </a>{" "}
              ({config.source.seriesId}), but the pipeline hasn&rsquo;t populated it yet. Run{" "}
              <code className="rounded bg-[var(--page-plane)] px-1.5 py-0.5 text-sm">
                npm run pipeline
              </code>{" "}
              to fetch real data, or check back after the next scheduled refresh.
            </p>
          )}
          {config.dataPolicy && (
            <p
              className="mt-3 rounded-md border p-2.5 text-sm"
              style={{ borderColor: "var(--status-warning)", color: "var(--text-secondary)" }}
            >
              <span style={{ color: "var(--status-warning)" }}>⚠ Data policy: </span>
              {config.dataPolicy}
            </p>
          )}
          {describeScoringBasis(config) && (
            <p
              className="mt-3 rounded-md border p-2.5 text-sm"
              style={{ borderColor: "var(--status-warning)", color: "var(--text-secondary)" }}
            >
              <span style={{ color: "var(--status-warning)" }}>⚠ Alternate scoring basis: </span>
              {describeScoringBasis(config)}
            </p>
          )}
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {describeMaturityTier("awaiting-data", config.name)} See{" "}
            <a href="/status" className="underline hover:text-[var(--text-primary)]">
              Data status
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const score = computeGaugeScore(data, config, gaugesConfig.directionThresholdScorePointsPerYear);
  const whyThisMatters = getWhyThisMatters(slug);
  const dataUrl = `/data/processed/${slug}.json`;
  const usesLatestWaveBasis = config.scoringBasis === "latest-wave-per-country";
  const dotStripPoints = usesLatestWaveBasis
    ? computeLevelScoreForAllCountriesLatestWave(data, config)
    : score.latestYear
      ? computeLevelScoreForAllCountries(data, config, score.latestYear)
      : [];

  // The "Two ways to read this" block assumes the site's default same-year
  // comparison throughout (raw trend vs. same-year peer-relative trend) —
  // deliberately suppressed for latest-wave-per-country gauges rather than
  // showing a peerTrend built on a different, less appropriate basis than
  // the direction already shown above, which could visibly disagree with it.
  const rawTrend =
    score.latestYear && !usesLatestWaveBasis
      ? computeRawValueTrend(data, "AUS", score.latestYear, gaugesConfig.directionThresholdPctPerYear)
      : null;
  const peerTrend =
    score.latestYear && !usesLatestWaveBasis
      ? computePeerRelativeTrend(
          data,
          config,
          "AUS",
          score.latestYear,
          gaugesConfig.directionThresholdScorePointsPerYear
        )
      : null;
  const twoWaysSentence =
    rawTrend && peerTrend ? describeTwoWaysToRead(rawTrend, peerTrend, config.shortName) : null;
  const maturity = computeMaturity(config, data);
  const scoringBasisNote = describeScoringBasis(config);
  // Only surfaced here when the gauge is actually stale (or carries a
  // custom staleDisclosure, which always wins once stale) — a fresh manual
  // gauge already reads fine via the maturity block below, no need to
  // duplicate that here too.
  const staleness = manualStaleness(config, data);
  const staleNote = staleness?.stale ? describeWhatsNext(config, data, maturity) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {data.provenance.status === "SAMPLE_DATA" && (
        <div className="mb-4">
          <SampleDataBadge />
        </div>
      )}

      <p className="text-sm text-[var(--text-muted)]">
        {config.unit} · {dimensionNames}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-bold">{config.name}</h1>
        <MaturityTag tier={maturity.tier} reason={maturity.reason} />
        <EvidenceTag strength={config.evidenceStrength} />
      </div>

      {config.reuseNote && (
        <p
          className="mt-3 max-w-2xl rounded-md border p-2.5 text-sm"
          style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
        >
          <span className="font-medium text-[var(--text-primary)]">Scored in both dimensions: </span>
          {config.reuseNote}
        </p>
      )}

      {scoringBasisNote && (
        <p
          className="mt-3 max-w-2xl rounded-md border p-2.5 text-sm"
          style={{ borderColor: "var(--status-warning)", color: "var(--text-secondary)" }}
        >
          <span style={{ color: "var(--status-warning)" }}>⚠ Alternate scoring basis: </span>
          {scoringBasisNote}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div>
          <div className="text-4xl font-bold tabular-nums text-[var(--accent-australia)]">
            {score.levelScore !== null ? Math.round(score.levelScore) : "—"}
            <span className="text-lg font-normal text-[var(--text-secondary)]"> / 100</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Australia&rsquo;s level score, {score.latestYear || "n/a"}
          </p>
        </div>
        <div>
          <DirectionArrow direction={score.direction} />
          <p className="text-xs text-[var(--text-muted)]">Trailing ~10yr, position vs peers</p>
        </div>
        {score.australiaRank !== null && (
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {score.australiaRank} <span className="text-base font-normal text-[var(--text-secondary)]">of {score.peerCount}</span>
            </p>
            <p className="text-xs text-[var(--text-muted)]">Rank among peers, {score.latestYear || "n/a"}</p>
          </div>
        )}
      </div>

      {dotStripPoints.length > 0 && (
        <section className="mt-6">
          <DotStrip
            points={dotStripPoints}
            bands={gaugesConfig.scoreBands}
            size="detail"
            missingCountries={data.provenance.missingCountries}
          />
        </section>
      )}

      {rawTrend && peerTrend && (
        <section className="mt-8 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
          <h2 className="mb-3 text-lg font-semibold">Two ways to read this</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Australia&rsquo;s own number
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--text-secondary)]">
                {rawTrend.direction === "up" ? "↑" : rawTrend.direction === "down" ? "↓" : "→"}{" "}
                {rawTrend.totalPctChange > 0 ? "+" : ""}
                {rawTrend.totalPctChange}%
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {rawTrend.startYear}&ndash;{rawTrend.endYear}, raw value
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Position vs peers
              </p>
              <div className="mt-1">
                <DirectionArrow direction={peerTrend.direction} />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {peerTrend.delta > 0 ? "+" : ""}
                {peerTrend.delta} pts, {peerTrend.startYear}&ndash;{peerTrend.endYear}
              </p>
            </div>
          </div>
          {twoWaysSentence && (
            <p className="mt-4 border-t border-[var(--gridline)] pt-3 text-sm text-[var(--text-secondary)]">
              {twoWaysSentence}
            </p>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Australia vs peers over time</h2>
        <TimeSeriesChart data={data} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Australia&rsquo;s rank over time</h2>
        <RankChart data={data} config={config} />
      </section>

      <section className="mt-8 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="mb-2 text-lg font-semibold">Why this matters</h2>
        <p className="whitespace-pre-line text-[var(--text-secondary)]">{whyThisMatters}</p>
      </section>

      {data.contextSeries?.map((ctx, i) => (
        <section
          key={`${ctx.label}-${i}`}
          className="mt-8 rounded-lg border border-dashed border-[var(--gridline)] bg-[var(--surface-1)] p-5"
        >
          <h2 className="mb-1 text-lg font-semibold">For context: {ctx.label}</h2>
          <p className="mb-3 text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Shown for context only — not part of this gauge&rsquo;s score
          </p>
          {ctx.note && <p className="mb-3 text-sm text-[var(--text-secondary)]">{ctx.note}</p>}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {Object.entries(ctx.countries).map(([code, series]) => {
              const latest = series && series.series.length > 0 ? series.series[series.series.length - 1] : null;
              return (
                <div key={code} className="flex items-baseline justify-between gap-2">
                  <dt className="text-[var(--text-muted)]">{series?.name ?? code}</dt>
                  <dd className="tabular-nums text-[var(--text-primary)]">
                    {latest ? `${latest.value} (${latest.year})` : "—"}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            {ctx.institution}
            {ctx.retrievedAt && ` · retrieved ${ctx.retrievedAt.slice(0, 10)}`}
            {" · "}
            <a href={ctx.url} className="underline" target="_blank" rel="noreferrer">
              source
            </a>
          </p>
        </section>
      ))}

      {staleNote && (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">
          <span className="text-[var(--text-muted)]">Freshness: </span>
          {staleNote}
        </p>
      )}

      {maturity.tier !== "established" && (
        <p className="mt-8 text-sm text-[var(--text-secondary)]">
          {describeMaturityTier(maturity.tier, config.shortName)}
          {maturity.reason && ` ${maturity.reason}`} See{" "}
          <a href="/status" className="underline hover:text-[var(--text-primary)]">
            Data status
          </a>
          .
        </p>
      )}

      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gridline)] pt-4">
        <SourceFooter provenance={data.provenance} />
        <a
          href={dataUrl}
          download
          className="rounded-md border border-[var(--gridline)] px-3 py-1.5 text-xs font-medium hover:border-[var(--accent-australia)]"
        >
          Download data (JSON)
        </a>
      </section>
    </div>
  );
}
