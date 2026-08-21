import Link from "next/link";
import type { GaugeConfig } from "@/lib/types";

/**
 * The homepage/dimension-grid card for a gauge that's deliberately not
 * scored (see GaugeConfig.unscoredDimensions) — no band, no rank, no
 * position strip, since none of those are meaningful for data that was
 * never fed into a composite. Distinct from both GaugeCard (has a real
 * band) and AwaitingDataCard (nothing has landed yet) — this gauge has
 * real data, on purpose, with no score. Same S7 declared-statement rule
 * as `/table/[plate]`'s own UnscoredDeclaration: never an empty region.
 */
export default function UnscoredGaugeCard({ config, plate }: { config: GaugeConfig; plate: string }) {
  return (
    <Link
      href={`/table/${plate}`}
      className="block border border-chrome bg-paper p-4 font-public-sans text-ink transition hover:border-ink"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-martian-mono text-[11px] font-bold tracking-[.08em]">{plate}</div>
        <span className="font-martian-mono text-[8.5px] font-medium tracking-[.1em] border border-ink-3 text-ink-3 px-[5px] py-[1px]">
          NOT SCORED
        </span>
      </div>
      <h3 className="font-semibold text-[15px] leading-[1.25] mt-1.5">{config.name}</h3>
      <p className="font-public-sans text-[12.5px] text-ink-2 mt-2">{config.oneLiner}</p>
      {config.unscoredReason && (
        <p className="font-martian-mono text-[10px] text-ink-3 mt-2 leading-[1.5] line-clamp-2">
          {config.unscoredReason}
        </p>
      )}
    </Link>
  );
}
