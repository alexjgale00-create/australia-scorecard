"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CountryCode } from "@/lib/types";
import type { Peer, MissingPeer } from "@/lib/gauge-view";

/**
 * REGISTER's dimension overview — /section/[n]. See DESIGN.md "Surface:
 * dimension overview" for the spec and the ruling history (URL-shareable
 * weighting, the dagger convention, the cross-reference row for a gauge
 * reused across dimensions). Client component: the weighting equation is
 * interactive and reads/writes ?w= after mount — see the note on
 * useSearchParams below for why that's a plain effect, not the
 * next/navigation hook.
 */

export interface CountryScore {
  code: CountryCode;
  name: string;
  power: number;
  life: number;
}

export type SectionRow =
  | {
      kind: "scored";
      gaugeId: string;
      plate: string;
      name: string;
      unit: string;
      invertedAxis: boolean;
      aus: { value: number; score: number };
      peers: Peer[];
      missingPeers: MissingPeer[];
      bandLabel: string;
      bandTicks: string;
      /** Renders a ‡ marker in the BAND cell — deliberately NOT † (Fix: dagger already means "rank differs from default weighting" in the rank strip on this same page; reusing it here would conflate two different declarations even though they're in different tables). */
      bandOverstates: boolean;
      rank: string;
      delta: string;
      asOf: string;
      stale: boolean;
    }
  | {
      kind: "cross-reference";
      gaugeId: string;
      name: string;
      primaryPlate: string;
      primaryDimensionName: string;
      countsTowardComposite: boolean;
    }
  | { kind: "unscored"; gaugeId: string; name: string; plate: string; reason: string }
  | { kind: "awaiting-data"; gaugeId: string; name: string; plate: string };

const DEFAULT_WEIGHT = 0.6;
const STEP = 0.05;

function clamp01(w: number): number {
  return Math.min(1, Math.max(0, Math.round(w * 100) / 100));
}

function rankAll(countryScores: CountryScore[], w: number): { code: CountryCode; rank: number; idx: number }[] {
  const rows = countryScores.map((c) => ({ code: c.code, idx: Math.round((w * c.power + (1 - w) * c.life) * 10) / 10 }));
  rows.sort((a, b) => b.idx - a.idx);
  return rows.map((r, i) => ({ code: r.code, rank: i + 1, idx: r.idx }));
}

export default function SectionOverview({
  sectionNumber,
  dimensionName,
  countryScores,
  rows,
}: {
  sectionNumber: 1 | 2;
  dimensionName: string;
  countryScores: CountryScore[];
  rows: SectionRow[];
}) {
  const [w, setW] = useState(DEFAULT_WEIGHT);

  // Read ?w= after mount rather than via next/navigation's useSearchParams,
  // which requires a Suspense boundary during static export — this page is
  // fully static (output: "export"), so the weight lives entirely in
  // client-side state, enhanced from the URL post-hydration. Writing back
  // uses history.replaceState directly for the same reason: no Next
  // navigation/refetch should happen on a stepper click, just a URL update.
  //
  // window is genuinely unavailable during the build's server-render pass
  // (this is a client component, but Next still renders it once on the
  // server for the static HTML shell) — reading window.location in a lazy
  // useState initializer would either throw server-side or, guarded, read
  // a different value client-side than what was server-rendered, causing
  // a hydration mismatch. Reading it in an effect (client-only, runs after
  // hydration) is the correct, standard fix for exactly this constraint,
  // not an oversight — the setState-in-effect lint rule's general concern
  // doesn't apply here since it's conditional (no URL param, no render).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("w");
    if (raw !== null) {
      const parsed = Number.parseFloat(raw);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see the comment above: reading window.location can only happen post-hydration, this is the standard fix for that constraint, not the "derived state" antipattern this rule targets.
      if (!Number.isNaN(parsed)) setW(clamp01(parsed));
    }
  }, []);

  const setWeightAndUrl = (next: number) => {
    const clamped = clamp01(next);
    setW(clamped);
    const url = new URL(window.location.href);
    url.searchParams.set("w", clamped.toFixed(2));
    window.history.replaceState(null, "", url.toString());
  };

  const life = Math.round((1 - w) * 100) / 100;
  const currentRanks = rankAll(countryScores, w);
  const defaultRanks = rankAll(countryScores, DEFAULT_WEIGHT);
  const defaultRankMap = new Map(defaultRanks.map((r) => [r.code, r.rank]));
  const anyChanged = currentRanks.some((r) => r.rank !== defaultRankMap.get(r.code));
  const isDefaultWeight = Math.abs(w - DEFAULT_WEIGHT) < 0.001;

  return (
    <div className="register bg-paper font-public-sans text-ink min-h-screen p-6 sm:p-[48px_56px_56px]">
      <div className="mx-auto max-w-[1280px]">
        {/* ---------- Header ---------- */}
        <div className="flex justify-between items-baseline border-b border-ink pb-2.5 flex-wrap gap-2">
          <div className="font-martian-mono text-[12px] font-bold tracking-[.22em]">AUSTRALIA SCORECARD</div>
          <div className="font-martian-mono text-[10.5px] font-medium tracking-[.1em]">
            SECTION {sectionNumber} · {dimensionName.toUpperCase()} · {rows.length} GAUGES
          </div>
        </div>

        <div className="flex justify-between items-end flex-wrap gap-4 mt-6 mb-2">
          <h1 className="font-bold text-[24px] sm:text-[30px] tracking-[-.01em] m-0">{dimensionName}</h1>
          <div className="flex items-center gap-2.5 font-martian-mono text-[13px] font-semibold tabular-nums whitespace-nowrap">
            <span>YOUR INDEX =</span>
            <Stepper onClick={() => setWeightAndUrl(w - STEP)} label="−" />
            <span className="font-extrabold">{w.toFixed(2)}</span>
            <span>
              × POWER + <b className="font-extrabold">{life.toFixed(2)}</b> × LIFE
            </span>
            <Stepper onClick={() => setWeightAndUrl(w + STEP)} label="+" />
          </div>
        </div>

        {/* ---------- Rank strip ---------- */}
        <div
          className="border-t-[3px] border-ink border-b border-ink grid mt-3.5"
          style={{ gridTemplateColumns: `repeat(${currentRanks.length}, 1fr)` }}
        >
          {currentRanks.map((r) => {
            const c = countryScores.find((cs) => cs.code === r.code)!;
            const dagger = r.rank !== defaultRankMap.get(r.code);
            return (
              <div
                key={r.code}
                title={c.name}
                className={`p-2.5 pb-2 text-center border-r border-grid last:border-r-0 ${r.code === "AUS" ? "bg-desk" : ""}`}
              >
                <div className="font-martian-mono font-extrabold text-[17px] tabular-nums">
                  {r.rank}
                  {dagger ? "†" : ""}
                </div>
                <div className={`font-martian-mono text-[12px] tracking-[.08em] mt-0.5 ${r.code === "AUS" ? "font-extrabold" : "font-medium"}`}>
                  {r.code}
                </div>
                <div className="font-martian-mono text-[10.5px] text-ink-2 tabular-nums mt-0.5">{r.idx.toFixed(1)}</div>
              </div>
            );
          })}
        </div>

        {/* Never dismissible — the screenshot-safety device (R.. see DESIGN.md). No close button, always rendered. */}
        <p className="font-martian-mono text-[10.5px] text-ink-2 mt-2">
          {isDefaultWeight && !anyChanged ? (
            <>Default weighting 0.60 POWER / 0.40 LIFE shown. Adjust the coefficients above — ranks that change will carry a dagger (†) and this note will state your weights. Scores are dimension composites, 0–100.</>
          ) : (
            <>
              † rank differs from the default weighting. Yours: {w.toFixed(2)} POWER / {life.toFixed(2)} LIFE · default:
              {" "}{DEFAULT_WEIGHT.toFixed(2)} / {(1 - DEFAULT_WEIGHT).toFixed(2)}. Scores are dimension composites, 0–100.
            </>
          )}
        </p>

        {/* ---------- Gauge table ---------- */}
        <div className="overflow-x-auto mt-8">
          <table className="w-full border-collapse tabular-nums min-w-[900px]">
            <thead>
              <tr className="font-martian-mono text-[10px] font-bold tracking-[.12em]">
                <td className="border-b border-ink py-2">TABLE</td>
                <td className="border-b border-ink py-2">GAUGE</td>
                <td className="border-b border-ink py-2">UNIT</td>
                <td className="border-b border-ink py-2 text-right">AUS</td>
                <td className="border-b border-ink py-2 px-5">POSITION AMONG PEERS ⟶</td>
                <td className="border-b border-ink py-2">BAND</td>
                <td className="border-b border-ink py-2 text-right">RANK</td>
                <td className="border-b border-ink py-2 text-right">Δ</td>
                <td className="border-b border-ink py-2 pl-6">AS OF</td>
              </tr>
            </thead>
            <tbody className="font-martian-mono text-[12.5px]">
              {rows.map((row, i) => (
                <GaugeRow key={row.gaugeId} row={row} isLast={i === rows.length - 1} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-11 mt-4 font-martian-mono text-[10.5px] leading-[1.8] text-ink-2">
          <div>◆ AUS · | peers</div>
          <div>
            <span className="text-stamp">STALE</span> = source pull &gt; 6 months old · <span className="text-stamp">n.a.</span> = not published,
            declared not hidden · <span>‡</span> = band depends on an outlier at the worst end of the peer set (Methods §3.3) ·
            band thresholds under methodology review (§3.1)
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="font-martian-mono text-[13px] font-bold border border-ink bg-paper text-ink w-6 h-6 cursor-pointer hover:bg-ink hover:text-paper p-0"
      aria-label={label === "+" ? "Increase POWER weight" : "Decrease POWER weight"}
    >
      {label}
    </button>
  );
}

function GaugeRow({ row, isLast }: { row: SectionRow; isLast: boolean }) {
  const borderCls = isLast ? "border-b border-ink" : "border-b border-grid";

  if (row.kind === "cross-reference") {
    return (
      <tr className={borderCls}>
        <td className="py-2.5 pr-3.5" />
        <td className="font-public-sans text-[14px] py-2.5 pr-4 text-ink-2" colSpan={7}>
          {row.name} — scored in {row.primaryDimensionName}, not a separate table here.{" "}
          <Link href={`/table/${row.primaryPlate}`} className="underline decoration-chrome hover:decoration-ink">
            See Table {row.primaryPlate}
          </Link>
          {row.countsTowardComposite ? " (still counted in this dimension's composite)." : ""}
        </td>
      </tr>
    );
  }

  if (row.kind === "unscored") {
    return (
      <tr className={borderCls}>
        <td className="py-2.5 pr-3.5 font-bold">
          <Link href={`/table/${row.plate}`} className="no-underline border-b border-chrome hover:border-ink">
            {row.plate}
          </Link>
        </td>
        <td className="font-public-sans text-[14px] py-2.5 pr-4">{row.name}</td>
        <td className="text-stamp py-2.5 pr-3.5" colSpan={6}>
          NOT SCORED — {row.reason}
        </td>
      </tr>
    );
  }

  if (row.kind === "awaiting-data") {
    return (
      <tr className={borderCls}>
        <td className="py-2.5 pr-3.5 font-bold">
          <Link href={`/table/${row.plate}`} className="no-underline border-b border-chrome hover:border-ink">
            {row.plate}
          </Link>
        </td>
        <td className="font-public-sans text-[14px] py-2.5 pr-4">{row.name}</td>
        <td className="text-stamp py-2.5 pr-3.5" colSpan={6}>
          AWAITING DATA
        </td>
      </tr>
    );
  }

  const bandWeight = row.bandLabel === "Falling Behind" ? "font-extrabold" : row.bandLabel === "Slipping" ? "font-bold" : "";

  return (
    <tr className={borderCls}>
      <td className="py-2.5 pr-3.5 font-bold">
        <Link href={`/table/${row.plate}`} className="no-underline border-b border-chrome hover:border-ink">
          {row.plate}
        </Link>
      </td>
      <td className="font-public-sans text-[14px] py-2.5 pr-4">
        {row.name}
        {row.invertedAxis && <span className="font-martian-mono text-[10px] text-ink-2"> (LOW = AHEAD)</span>}
      </td>
      <td className="text-ink-2 text-[10.5px] py-2.5 pr-3.5">{row.unit.split("·")[0].trim()}</td>
      <td className="text-right font-semibold py-2.5 pr-3.5">{fmt(row.aus.value)}</td>
      <td className="py-2.5 px-5">
        <PositionStrip aus={row.aus} peers={row.peers} />
      </td>
      <td className={`tracking-[.06em] py-2.5 pr-3.5 ${bandWeight}`}>
        {row.bandLabel} {row.bandTicks}
        {row.bandOverstates ? " ‡" : ""}
      </td>
      <td className="text-right py-2.5 pr-3.5">
        {row.missingPeers.length > 0
          ? `${row.rank.split(" ")[0]} rep.`
          : row.rank}
      </td>
      <td className="text-right py-2.5 pr-3.5">{row.delta === "n.a." ? <span className="text-stamp">n.a.</span> : row.delta.replace(/^Δ [^:]+:\s*/, "")}</td>
      <td className={`pl-6 text-[10.5px] py-2.5 ${row.stale ? "text-stamp" : ""}`}>
        {row.asOf}
        {row.stale ? " · STALE" : ""}
      </td>
    </tr>
  );
}

function PositionStrip({ aus, peers }: { aus: { score: number }; peers: Peer[] }) {
  return (
    <div className="relative h-3.5 border-l border-chrome border-r min-w-[220px]">
      {peers.map((p) => (
        <span
          key={p.code}
          className="absolute w-[2px] h-2 bg-ink opacity-35"
          style={{ left: `${p.score}%`, top: 3 }}
          title={`${p.name}: ${fmt(p.value)}`}
        />
      ))}
      <span className="absolute text-[9px] leading-none" style={{ left: `${aus.score}%`, top: 0, transform: "translateX(-50%)" }}>
        ◆
      </span>
    </div>
  );
}

function fmt(n: number): string {
  if (Number.isNaN(n)) return "n.a.";
  return Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-AU") : String(Math.round(n * 100) / 100);
}
