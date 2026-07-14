import { notFound } from "next/navigation";
import { gaugesConfig, getAllGaugeIds, getGaugeConfig, getGaugeData } from "@/lib/gauges-data";
import {
  computeGaugeScore,
  computeLevelScoreForAllCountries,
  computePeerRelativeTrend,
  computeRawValueTrend,
  describeTwoWaysToRead,
} from "@/lib/scoring";
import { getWhyThisMatters } from "@/lib/content";
import TimeSeriesChart from "@/components/TimeSeriesChart";
import RankChart from "@/components/RankChart";
import DirectionArrow from "@/components/DirectionArrow";
import SourceFooter from "@/components/SourceFooter";
import SampleDataBadge from "@/components/SampleDataBadge";
import DotStrip from "@/components/DotStrip";

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

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-[var(--text-muted)]">{config.unit}</p>
        <h1 className="mt-1 text-3xl font-bold">{config.name}</h1>
        <div className="mt-6 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-6">
          <p className="font-semibold text-[var(--text-primary)]">
            This gauge is configured but doesn&rsquo;t have data yet.
          </p>
          <p className="mt-2 text-[var(--text-secondary)]">
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
        </div>
      </div>
    );
  }

  const score = computeGaugeScore(data, config, gaugesConfig.directionThresholdScorePointsPerYear);
  const whyThisMatters = getWhyThisMatters(slug);
  const dataUrl = `/data/processed/${slug}.json`;
  const dotStripPoints = score.latestYear
    ? computeLevelScoreForAllCountries(data, config, score.latestYear)
    : [];

  const rawTrend = score.latestYear
    ? computeRawValueTrend(data, "AUS", score.latestYear, gaugesConfig.directionThresholdPctPerYear)
    : null;
  const peerTrend = score.latestYear
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {data.provenance.status === "SAMPLE_DATA" && (
        <div className="mb-4">
          <SampleDataBadge />
        </div>
      )}

      <p className="text-sm text-[var(--text-muted)]">{config.unit}</p>
      <h1 className="mt-1 text-3xl font-bold">{config.name}</h1>

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

      <section className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gridline)] pt-4">
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
