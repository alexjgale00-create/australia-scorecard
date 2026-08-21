import Link from "next/link";
import type { GaugeConfig } from "@/lib/types";

/** For a configured gauge with no data file at all yet — same shell as GaugeCard, minus every score widget that has nothing to draw from. Links straight to /table/[plate], which renders its own REGISTER-styled AWAITING DATA state (see app/table/[plate]/page.tsx) — same content, not duplicated here. */
export default function AwaitingDataCard({ config, plate }: { config: GaugeConfig; plate: string }) {
  return (
    <Link
      href={`/table/${plate}`}
      className="block border border-chrome bg-paper p-4 font-public-sans text-ink transition hover:border-ink"
    >
      <div className="font-martian-mono text-[11px] font-bold tracking-[.08em]">{plate}</div>
      <h3 className="font-semibold text-[15px] leading-[1.25] mt-1.5">{config.name}</h3>
      <div className="font-martian-mono text-[11px] font-medium text-stamp mt-2.5">AWAITING DATA</div>
      <p className="font-public-sans text-[12.5px] text-ink-2 mt-2">{config.oneLiner}</p>
    </Link>
  );
}
