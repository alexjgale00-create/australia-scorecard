import Link from "next/link";
import type { GaugeConfig, GaugeData, GaugeScore, ScoreBand } from "@/lib/types";
import DirectionArrow from "@/components/DirectionArrow";
import DotStrip from "@/components/DotStrip";
import AnchoredSparkline from "@/components/AnchoredSparkline";
import { computeGaugeHistoricalLevelScores, computeLevelScoreForAllCountries } from "@/lib/scoring";

export default function GaugeCard({
  config,
  data,
  score,
  bands,
}: {
  config: GaugeConfig;
  data: GaugeData;
  score: GaugeScore;
  bands: ScoreBand[];
}) {
  const dotStripPoints = score.latestYear
    ? computeLevelScoreForAllCountries(data, config, score.latestYear)
    : [];
  const historicalScores = computeGaugeHistoricalLevelScores(data, config, "AUS");

  return (
    <Link
      href={`/gauges/${config.id}`}
      className="block rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5 transition hover:border-[var(--accent-australia)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[var(--text-primary)]">{config.name}</h3>
          {data.provenance.status === "SAMPLE_DATA" && (
            <span
              className="rounded-full border px-1.5 py-0.5 text-[0.65rem] font-medium leading-none"
              style={{ borderColor: "var(--status-warning)", color: "var(--status-warning)" }}
              title="This gauge is showing illustrative sample data, not a real published statistic."
            >
              Sample
            </span>
          )}
        </div>
        <div className="text-2xl font-bold tabular-nums text-[var(--accent-australia)]">
          {score.levelScore !== null ? Math.round(score.levelScore) : "—"}
        </div>
      </div>

      <div className="mt-2">
        <DirectionArrow direction={score.direction} />
      </div>

      {dotStripPoints.length > 0 && (
        <div className="mt-3">
          <DotStrip
            points={dotStripPoints}
            bands={bands}
            size="card"
            missingCountries={data.provenance.missingCountries}
          />
        </div>
      )}

      {historicalScores.length > 1 && (
        <div className="mt-3">
          <AnchoredSparkline points={historicalScores} bands={bands} size="mini" />
        </div>
      )}

      <p className="mt-3 text-sm text-[var(--text-secondary)]">{config.oneLiner}</p>
    </Link>
  );
}
