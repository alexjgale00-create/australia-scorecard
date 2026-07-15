import Link from "next/link";
import type { GaugeConfig } from "@/lib/types";
import MaturityTag from "@/components/MaturityTag";

/** For a configured gauge with no data file at all yet — same shell as GaugeCard, minus every score widget that has nothing to draw from. */
export default function AwaitingDataCard({ config }: { config: GaugeConfig }) {
  return (
    <Link
      href={`/gauges/${config.id}`}
      className="block rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5 transition hover:border-[var(--accent-australia)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[var(--text-primary)]">{config.name}</h3>
          <MaturityTag tier="awaiting-data" reason={null} />
        </div>
        <div className="text-2xl font-bold tabular-nums text-[var(--text-muted)]">—</div>
      </div>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">{config.oneLiner}</p>
    </Link>
  );
}
