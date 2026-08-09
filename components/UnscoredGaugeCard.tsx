import Link from "next/link";
import type { GaugeConfig, GaugeData } from "@/lib/types";
import MaturityTag from "@/components/MaturityTag";
import EvidenceTag from "@/components/EvidenceTag";
import UnscoredTag from "@/components/UnscoredTag";
import { computeMaturity } from "@/lib/maturity";

/**
 * The homepage/dimension-grid card for a gauge that's deliberately not
 * scored (see GaugeConfig.unscoredDimensions) — no level score, no
 * DirectionArrow, no dot strip, no sparkline, since none of those are
 * meaningful for data that was never fed into a composite. Distinct from
 * both GaugeCard (has a real score) and AwaitingDataCard (nothing has
 * landed yet) — this gauge has real data, on purpose, with no number.
 */
export default function UnscoredGaugeCard({
  config,
  data,
}: {
  config: GaugeConfig;
  data: GaugeData | null;
}) {
  const maturity = computeMaturity(config, data);

  return (
    <Link
      href={`/gauges/${config.id}`}
      className="block rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5 transition hover:border-[var(--accent-australia)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-[var(--text-primary)]">{config.name}</h3>
          <MaturityTag tier={maturity.tier} reason={maturity.reason} />
          <EvidenceTag strength={config.evidenceStrength} />
          <UnscoredTag />
        </div>
        <div className="text-2xl font-bold tabular-nums text-[var(--text-muted)]">—</div>
      </div>

      <p className="mt-3 text-sm text-[var(--text-secondary)]">{config.oneLiner}</p>

      {config.unscoredReason && (
        <p className="mt-3 text-xs text-[var(--text-muted)] line-clamp-2">{config.unscoredReason}</p>
      )}
    </Link>
  );
}
