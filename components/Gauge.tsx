"use client";

import { useState } from "react";
import type { GaugeView, Peer } from "@/lib/gauge-view";

/**
 * REGISTER's core component — see DESIGN.md for the full spec and the
 * ruling history behind every state and field that isn't in the original
 * handoff. Two densities (page scale here; a "card" density exists as a
 * documented but not-yet-exercised prop — see `density` below), seven
 * states, all prop-driven off a single GaugeView (lib/gauge-view.ts).
 *
 * No ScoreBand.color is imported anywhere in this file, on purpose (R1).
 * Band count, labels, and tick glyphs all come from `view.bands`
 * (gaugesConfig.scoreBands) — nothing here hardcodes a band count.
 */

export default function Gauge({ view, density = "page" }: { view: GaugeView; density?: "page" | "card" }) {
  const [dense, setDense] = useState(false);
  const [copied, setCopied] = useState(false);

  const citeText = `Australia Scorecard, Table ${view.plate} — ${view.title}, as at ${view.asOf}. /table/${view.plate}`;
  const copyCite = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(citeText).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const stripHeight = density === "card" ? 104 : 118;

  return (
    <div className="register bg-paper font-public-sans text-ink p-6 sm:p-[48px_56px_56px]">
      {/* ---------- Header row: plate (+ AUS LEADS / stale badges) / as-of ---------- */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-martian-mono text-[13px] font-bold tracking-[.1em]">TABLE {view.plate}</span>
            {view.scored && view.leads && (
              <span className="font-martian-mono text-[10px] font-medium tracking-[.14em] border border-ink px-[7px] py-[2px]">
                ▲ AUS LEADS
              </span>
            )}
            {view.isSampleData && (
              <span
                className="font-martian-mono text-[10px] font-bold tracking-[.14em] border border-stamp text-stamp px-[7px] py-[2px]"
                title="Illustrative placeholder data, not a real published statistic."
              >
                ⚠ SAMPLE DATA — NOT REAL
              </span>
            )}
          </div>
          <h1 className="font-public-sans font-bold text-[28px] sm:text-[36px] leading-[1.1] tracking-[-.01em] mt-2 mb-2.5">
            {view.title}
          </h1>
          <div className="font-martian-mono text-[10px] sm:text-[11px] font-medium tracking-[.06em] uppercase">
            {view.unitLine}
            {view.scored && view.invertedAxis ? " · LOW = AHEAD" : ""}
          </div>
        </div>
        <div className="text-right font-martian-mono text-[11px] leading-[1.9] tabular-nums">
          <div className={`font-bold ${view.stale ? "text-stamp" : "text-ink"}`}>
            AS OF {view.asOf}
            {view.stale ? " · STALE" : ""}
          </div>
          <div className="text-ink-3">{view.refreshNote}</div>
          <div className="text-ink-3">{view.observation}</div>
          {view.stale && view.staleReason && <div className="text-stamp">{view.staleReason}</div>}
        </div>
      </div>

      <div className="h-[3px] bg-ink my-4 sm:my-[18px_0_22px]" />

      {/* ---------- Plain-language line ---------- */}
      <p className="font-public-sans text-[15px] sm:text-[17.5px] leading-[1.5] max-w-[62ch] mb-6 sm:mb-[34px] tabular-nums">
        {view.plainLine}
      </p>

      {/* ---------- Measurement column + apparatus column ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_340px] gap-8 sm:gap-[48px] items-start">
        <div>{view.scored ? <ScoredStrip view={view} height={stripHeight} /> : <UnscoredDeclaration view={view} />}</div>

        <div className="border-l-2 border-ink pl-[14px] sm:pl-[22px]">
          <Apparatus view={view} />

          <div className="border border-chrome mt-6 p-3 sm:p-[12px_14px]">
            <div className="font-martian-mono text-[9.5px] font-bold tracking-[.16em] text-ink-3 mb-1.5">CITE AS</div>
            <div className="font-martian-mono text-[10px] sm:text-[11px] leading-[1.6]">{citeText}</div>
            <button
              onClick={copyCite}
              className="mt-2.5 font-martian-mono text-[10px] font-bold tracking-[.14em] border border-ink bg-paper text-ink px-3.5 py-1.5 cursor-pointer hover:bg-ink hover:text-paper"
            >
              {copied ? "COPIED ✓" : "COPY"}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Dense layer ---------- */}
      <div className="mt-8 sm:mt-10 border-t border-ink">
        <button
          onClick={() => setDense((d) => !d)}
          className="w-full flex justify-between items-center font-martian-mono text-[11px] font-bold tracking-[.16em] bg-transparent border-none text-ink py-3.5 cursor-pointer hover:opacity-70"
        >
          <span>DENSE LAYER — FULL PEER TABLE · SERIES · DEFINITION · REVISIONS</span>
          <span>{dense ? "⊟" : "⊞"}</span>
        </button>
        {dense && <DenseLayerContent view={view} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scored branch: band strip, axis-outlier badge, missing-peer note,
// bandRobustness qualifier, summary metrics.
// ---------------------------------------------------------------------------

function ScoredStrip({ view, height }: { view: Extract<GaugeView, { scored: true }>; height: number }) {
  const gridTemplate = view.bands.map((b) => `${b.widthPct}%`).join(" ");
  const outlier = view.axisOutlier;

  return (
    <div>
      <div className="grid font-martian-mono text-[8px] sm:text-[10px] font-semibold tracking-[.08em] sm:tracking-[.14em] text-ink-3 pb-1.5" style={{ gridTemplateColumns: gridTemplate }}>
        {view.bands.map((b) => (
          <div key={b.key} aria-hidden="true">
            {b.label.toUpperCase()} {b.ticks}
          </div>
        ))}
      </div>

      <div className="flex items-stretch gap-2">
        {outlier?.endsAt === "behind" && <OutlierBadge outlier={outlier} />}

        <div className="relative flex-1 border-t border-ink border-b border-chrome" style={{ height }}>
          {view.bands.slice(1).map((b) => (
            <div key={b.key} className="absolute top-0 bottom-0 border-l border-grid" style={{ left: `${b.min}%` }} />
          ))}

          {view.peers.map((p, i) => (
            <PeerMark key={p.code} peer={p} index={i} />
          ))}

          <div
            className="absolute text-center"
            style={{ left: `${view.aus.score}%`, top: 6, transform: "translateX(-50%)" }}
          >
            <div className="font-martian-mono font-extrabold text-[17px] sm:text-[22px] tabular-nums">
              {fmtValue(view.aus.value)}
            </div>
            <div className="font-martian-mono font-bold text-[9px] sm:text-[11px] tracking-[.1em]">◆ AUS</div>
          </div>
        </div>

        {outlier?.endsAt === "ahead" && <OutlierBadge outlier={outlier} />}
      </div>

      {/* Visually hidden accessible table — the honest text alternative for the peer marks (also the print fallback). */}
      <table className="sr-only">
        <caption>{view.title}: Australia and peer scores</caption>
        <thead>
          <tr>
            <th>Country</th>
            <th>Value</th>
            <th>Band</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Australia</td>
            <td>{view.aus.value}</td>
            <td>{view.bands.find((b) => b.key === view.ausBand)?.label}</td>
          </tr>
          {view.peers.map((p) => (
            <tr key={p.code}>
              <td>{p.name}</td>
              <td>{p.value}</td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap gap-5 sm:gap-[34px] mt-3 font-martian-mono text-[9.5px] sm:text-[11px] tracking-[.06em] tabular-nums">
        <span className="font-bold">RANK {view.rank}</span>
        <span>
          BAND: {view.bands.find((b) => b.key === view.ausBand)?.label.toUpperCase()}{" "}
          {view.bands.find((b) => b.key === view.ausBand)?.ticks}
        </span>
        <span>{view.delta}</span>
        {view.peerMedian !== null && <span className="text-ink-2">peer median {fmtValue(view.peerMedian)}</span>}
      </div>

      {view.bandRobustness && view.bandRobustness.direction === "overstates" && (
        <div className="font-martian-mono text-[10.5px] leading-[1.7] text-stamp mt-2 max-w-[62ch]">
          BAND NOT ROBUST — this band depends on {view.bandRobustness.dependsOnCountryName} sitting at the worst end
          of the peer set. Excluding {view.bandRobustness.dependsOnCountryName} from the scale bounds:{" "}
          {view.bandRobustness.alternateBandLabel}. ({view.bandRobustness.methodsRef})
        </div>
      )}

      {view.missingPeers.length > 0 && (
        <div className="border border-chrome text-stamp font-martian-mono text-[11px] leading-[1.7] mt-3.5 p-2.5 sm:p-[10px_14px]">
          n.a. — {view.missingPeers.map((m) => m.name).join(" · ")}:{" "}
          {view.missingPeers[0].reason} Rank and median are computed over the reporting peers only.
        </div>
      )}

      <div className="font-martian-mono text-[10.5px] text-ink-3 mt-2">
        Band boundaries indicative — thresholds under methodology review (Methods §3.1).
      </div>
    </div>
  );
}

function PeerMark({ peer, index }: { peer: Peer; index: number }) {
  const top = index % 2 === 0 ? 54 : 78;
  return (
    <div
      className="absolute text-center font-martian-mono text-[8.5px] sm:text-[10.5px] font-medium opacity-60"
      style={{ left: `${peer.score}%`, top, transform: "translateX(-50%)" }}
      title={`${peer.name}: ${peer.value}${peer.asOfYear ? ` (${peer.asOfYear})` : ""}`}
    >
      {peer.code}
      <div className="tabular-nums hidden sm:block">{fmtValue(peer.value)}</div>
    </div>
  );
}

function OutlierBadge({ outlier }: { outlier: NonNullable<Extract<GaugeView, { scored: true }>["axisOutlier"]> }) {
  return (
    <div
      className="shrink-0 flex flex-col justify-center font-martian-mono text-[8.5px] sm:text-[10.5px] leading-tight text-ink"
      title={`${outlier.name} is off this scale: ${outlier.value}, ${outlier.multiple}× the next-closest peer (gap ${outlier.gapAbsolute > 0 ? "+" : ""}${outlier.gapAbsolute}). Shown as a note, not a position, to keep the scale readable for the rest of the field.`}
    >
      <span className="tabular-nums">
        {outlier.code} ⟶ {fmtValue(outlier.value)}
      </span>
      <span className="text-ink-2 tabular-nums">
        ({outlier.gapAbsolute > 0 ? "+" : ""}
        {outlier.gapAbsolute} · {outlier.multiple}×)
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// S7 — unscored: no band strip, no rank, no delta. A declared statement
// where the strip would sit, same typographic status as n.a./NOT ESTABLISHED.
// ---------------------------------------------------------------------------

function UnscoredDeclaration({ view }: { view: Extract<GaugeView, { scored: false }> }) {
  return (
    <div className="border border-chrome p-4 sm:p-[16px_18px]">
      <div className="font-martian-mono text-[12px] font-medium text-stamp mb-1.5">NOT SCORED</div>
      <div className="font-martian-mono text-[11px] leading-[1.8] text-ink-2 max-w-[62ch]">{view.reason}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Apparatus: CAUSE / PRECEDENT (or CHALLENGER) / SCALE
// ---------------------------------------------------------------------------

function Apparatus({ view }: { view: GaugeView }) {
  const isChallenger = view.scored && view.leads;
  return (
    <div className="font-public-sans text-[13px] sm:text-[14.5px] leading-[1.55] grid gap-4">
      <ApparatusLine label="CAUSE" attribution={view.cause} />
      <ApparatusLine
        label={isChallenger ? "CHALLENGER" : "PRECEDENT"}
        rubric={isChallenger ? "replaces PRECEDENT when Australia leads: there is no peer ahead to draw precedent from." : undefined}
        attribution={view.precedent}
      />
      <div>
        <div className="font-martian-mono text-[9.5px] sm:text-[10.5px] font-bold tracking-[.16em] mb-1">SCALE</div>
        {view.scale}
      </div>
    </div>
  );
}

function ApparatusLine({
  label,
  rubric,
  attribution,
}: {
  label: string;
  rubric?: string;
  attribution: { kind: "established"; body: React.ReactNode } | { kind: "not-established"; body: React.ReactNode };
}) {
  return (
    <div>
      <div className="font-martian-mono text-[9.5px] sm:text-[10.5px] font-bold tracking-[.16em] mb-1">
        {label}
        {rubric && <span className="font-normal text-ink-3 normal-case tracking-normal"> — {rubric}</span>}
      </div>
      {attribution.kind === "not-established" ? (
        <>
          <span className="font-martian-mono text-[12px] font-medium text-stamp">NOT ESTABLISHED</span>
          <span className="text-ink-2"> — {attribution.body}</span>
        </>
      ) : (
        attribution.body
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dense layer
// ---------------------------------------------------------------------------

function DenseLayerContent({ view }: { view: GaugeView }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_340px] gap-8 sm:gap-[48px] pb-2">
      <div>
        {view.scored ? (
          <>
            <table className="w-full border-collapse font-martian-mono text-[11px] sm:text-[12.5px] tabular-nums">
              <thead>
                <tr className="font-bold text-[10px] tracking-[.1em]">
                  <td className="border-b border-ink py-1.5">COUNTRY</td>
                  <td className="border-b border-ink py-1.5 text-right">VALUE</td>
                  <td className="border-b border-ink py-1.5 text-right">OBS. YEAR</td>
                </tr>
              </thead>
              <tbody className="leading-[2.1]">
                {view.dense.table.map((row) => (
                  <tr
                    key={row.code}
                    className={row.code === "AUS" ? "font-extrabold border-t border-b border-ink" : ""}
                  >
                    <td>
                      {row.code}
                      {row.code === "AUS" ? " ◆" : ""}
                    </td>
                    <td className="text-right">{fmtValue(row.primary)}</td>
                    <td className="text-right">{row.obsYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6">
              <div className="font-martian-mono text-[10px] font-bold tracking-[.14em] mb-2">
                AUS SERIES — {view.unitLine.split("·")[0].trim()}
              </div>
              <div className="overflow-x-auto">
                <table className="border-collapse font-martian-mono text-[11px] tabular-nums">
                  <tbody>
                    <tr className="text-ink-3">
                      {view.dense.ausSeries.map((p) => (
                        <td key={p.year} className="pr-2.5 pt-0.5">
                          {p.year}
                        </td>
                      ))}
                    </tr>
                    <tr className="font-semibold border-t border-grid">
                      {view.dense.ausSeries.map((p) => (
                        <td key={p.year} className="pr-2.5 pt-1">
                          {fmtValue(p.value)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6">
              <div className="font-martian-mono text-[10px] font-bold tracking-[.14em] mb-2">
                AUS RANK OVER TIME
              </div>
              <RankHistoryChart points={view.dense.rankHistory} />
            </div>
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-collapse font-martian-mono text-[11px] tabular-nums">
              <tbody>
                <tr className="text-ink-3">
                  {view.dense.ausSeries.map((p) => (
                    <td key={p.year} className="pr-2.5 pt-0.5">
                      {p.year}
                    </td>
                  ))}
                </tr>
                <tr className="font-semibold border-t border-grid">
                  {view.dense.ausSeries.map((p) => (
                    <td key={p.year} className="pr-2.5 pt-1">
                      {fmtValue(p.value)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="font-public-sans text-[13px] text-ink-2 mt-3 max-w-[62ch]">
              Shown as raw values over time — not as a peer-relative score, band, or rank, since this gauge isn&rsquo;t scored.
            </p>
          </div>
        )}
      </div>

      <div className="font-public-sans text-[12.5px] sm:text-[13px] leading-[1.65] border-l border-chrome pl-[14px] sm:pl-[22px]">
        {view.dense.maturity.tier !== "established" && (
          <>
            <div className="font-martian-mono text-[10px] font-bold tracking-[.14em] mb-1.5">DATA MATURITY</div>
            <p className="mb-4 text-ink-2">
              {view.dense.maturity.tier.toUpperCase()}
              {view.dense.maturity.reason ? ` — ${view.dense.maturity.reason}` : ""}
            </p>
          </>
        )}
        {view.dense.evidenceStrength === "survey" && (
          <>
            <div className="font-martian-mono text-[10px] font-bold tracking-[.14em] mb-1.5">EVIDENCE</div>
            <p className="mb-4 text-ink-2">Survey-based — self-reported data, not a directly measured hard statistic.</p>
          </>
        )}
        {view.dense.scoringBasisNote && (
          <>
            <div className="font-martian-mono text-[10px] font-bold tracking-[.14em] mb-1.5">SCORING BASIS</div>
            <p className="mb-4 text-ink-2">{view.dense.scoringBasisNote}</p>
          </>
        )}
        {view.dense.reuseNote && (
          <>
            <div className="font-martian-mono text-[10px] font-bold tracking-[.14em] mb-1.5">SCORED IN BOTH DIMENSIONS</div>
            <p className="mb-4 text-ink-2">{view.dense.reuseNote}</p>
          </>
        )}

        <div className="font-martian-mono text-[10px] font-bold tracking-[.14em] mb-1.5">DEFINITION</div>
        <p className="mb-4">{view.dense.definition}</p>

        {view.dense.revisions && view.dense.revisions.length > 0 && (
          <>
            <div className="font-martian-mono text-[10px] font-bold tracking-[.14em] mb-1.5">REVISIONS</div>
            {view.dense.revisions.map((r, i) => (
              <p key={i} className="mb-4">
                {r.note} <span className="font-martian-mono text-[10.5px] text-stamp">REV {r.date}</span>
              </p>
            ))}
          </>
        )}

        <div className="font-martian-mono text-[10px] font-bold tracking-[.14em] mb-1.5">SOURCES</div>
        <p>{view.dense.sourcesNote}</p>

        {view.dense.contextSeries?.map((ctx, i) => (
          <div key={i} className="border border-dashed border-chrome mt-4 p-3">
            <div className="font-martian-mono text-[10px] font-bold tracking-[.14em] mb-1.5">
              FOR CONTEXT: {ctx.label.toUpperCase()}
            </div>
            <p className="text-ink-2 text-[11px]">Shown for context only — not part of this gauge&rsquo;s score.</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ink/chrome only (R1) — AUS at full weight, no peer lines (rank-of-N alone already carries peer context). */
function RankHistoryChart({ points }: { points: { year: number; rank: number | null; of: number }[] }) {
  const withRank = points.filter((p): p is { year: number; rank: number; of: number } => p.rank !== null);
  if (withRank.length === 0) return <p className="font-martian-mono text-[11px] text-ink-3">No rank history available.</p>;

  const maxOf = Math.max(...withRank.map((p) => p.of));
  const w = 480;
  const h = 72;
  const stepX = withRank.length > 1 ? w / (withRank.length - 1) : 0;
  const yFor = (rank: number) => ((rank - 1) / Math.max(1, maxOf - 1)) * (h - 8) + 4;
  const path = withRank.map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${yFor(p.rank)}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="block">
        <line x1={0} y1={h - 1} x2={w} y2={h - 1} stroke="var(--chrome)" strokeWidth={1} />
        <path d={path} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
        {withRank.map((p, i) => (
          <circle key={p.year} cx={i * stepX} cy={yFor(p.rank)} r={2} fill="var(--ink)" />
        ))}
      </svg>
      <div className="font-martian-mono text-[9px] text-ink-3 tabular-nums mt-1">
        {withRank[0].year} → {withRank[withRank.length - 1].year}, rank 1 (top) – {maxOf} (bottom)
      </div>
    </div>
  );
}

function fmtValue(n: number): string {
  if (Number.isNaN(n)) return "n.a.";
  return Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-AU") : String(Math.round(n * 100) / 100);
}
