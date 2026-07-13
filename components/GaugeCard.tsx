import Link from "next/link";
import type { GaugeConfig, GaugeScore } from "@/lib/types";
import DirectionArrow from "@/components/DirectionArrow";

export default function GaugeCard({
  config,
  score,
}: {
  config: GaugeConfig;
  score: GaugeScore;
}) {
  return (
    <Link
      href={`/gauges/${config.id}`}
      className="block rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5 transition hover:border-[var(--accent-australia)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-[var(--text-primary)]">{config.name}</h3>
        <div className="text-2xl font-bold tabular-nums text-[var(--accent-australia)]">
          {score.levelScore !== null ? Math.round(score.levelScore) : "—"}
        </div>
      </div>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{config.oneLiner}</p>
      <div className="mt-4 flex items-center justify-between">
        <DirectionArrow direction={score.direction} />
        {score.australiaRank !== null && (
          <span className="text-xs text-[var(--text-muted)]">
            Rank {score.australiaRank} of {score.peerCount}
          </span>
        )}
      </div>
    </Link>
  );
}
