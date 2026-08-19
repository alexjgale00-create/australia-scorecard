import type { ReactNode } from "react";
import type {
  CountryCode,
  DimensionId,
  EvidenceStrength,
  GaugeConfig,
  GaugeData,
  GaugesConfigFile,
  Polarity,
} from "@/lib/types";
import {
  bandForScore,
  computeLevelScoreForAllCountries,
  computeLevelScoreForAllCountriesLatestWave,
  computeRank,
  computeRankLatestWavePerCountry,
  computeRawValueTrend,
  describeScoringBasis,
  latestSharedYear,
} from "@/lib/scoring";
import { computeMaturity, manualStaleness, type MaturityInfo } from "@/lib/maturity";

/**
 * The view model REGISTER's <Gauge> component renders — adapted from the
 * raw GaugeConfig/GaugeData persisted shapes (lib/types.ts) rather than
 * replacing them. See DESIGN.md for the full component spec and the
 * ruling history behind every field here that isn't in the original
 * handoff (S7, bandRobustness, axisOutlier, the credibility apparatus).
 */

export type TickGlyph = string;

export interface Band {
  key: string;
  label: string;
  ticks: TickGlyph;
  min: number;
  max: number;
  /** Uniform across every gauge — derived from gaugesConfig.scoreBands, never per-gauge (Ruling B). */
  widthPct: number;
}

export interface Peer {
  code: CountryCode;
  name: string;
  value: number;
  score: number;
  /** Only set for latest-wave-per-country gauges — see ScoringBasis in lib/types.ts. */
  asOfYear?: number;
}

export interface MissingPeer {
  code: CountryCode;
  name: string;
  reason: string;
}

/**
 * Three variants, not two — "nobody has written this yet" and "the
 * evidence genuinely won't support attribution here" are different claims.
 * Both non-established variants render identically in --stamp, at the
 * same typographic weight (R5) — the distinction is the label and body
 * text a component chooses per kind, never styling.
 */
export type Attribution =
  | { kind: "established"; body: ReactNode }
  /** No attribution yet meets the evidence bar — could change if someone finds/writes a citable driver. The default for every gauge with no authored content. */
  | { kind: "not-established"; body: ReactNode }
  /** Attribution is actively disputed, or inherently multi-causal with no way to isolate one mechanism — this is the permanent answer, not a placeholder pending more research. */
  | { kind: "contested"; body: ReactNode };

/**
 * The default CAUSE/PRECEDENT for every gauge without drafted content —
 * most gauges today, since only 6 have a drafted CAUSE (content/
 * register-draft-lines.ts) and none has a drafted PRECEDENT yet.
 */
export const NOT_ESTABLISHED: Attribution = {
  kind: "not-established",
  body: "no attribution currently meets the evidence standard (Methods §3.2). Candidate explanations, where any exist, are logged in the source view; none is asserted here.",
};

/**
 * Which framing the sidecar badge uses — a mechanical function of the
 * gauge's `valueScale` (config, human-set), never a per-gauge display
 * preference. "ratio" is legible for ratio-scale quantities with a
 * meaningful zero (GDP share, spend, a rate like homicides per 100k, where
 * "2.9× the next-closest peer" is how the quantity is normally read).
 * "absolute-gap" is for interval-scale quantities (years of life
 * expectancy, an index score) where a ratio can compute fine but reads as
 * near-meaningless (0.98× says almost nothing next to a real 1.9-year gap).
 */
export type OutlierComparison =
  | { comparison: "ratio"; multiple: number }
  | { comparison: "absolute-gap"; gap: number; unit: string };

export interface AxisOutlier {
  code: CountryCode;
  name: string;
  value: number;
  comparison: OutlierComparison;
  /** Which end of the track the sidecar badge sits at — derived from real data + polarity, never config, never defaulted. See resolveAxisOutlier. */
  endsAt: "ahead" | "behind";
}

export interface DenseLayerRow {
  code: CountryCode;
  name: string;
  primary: number;
  delta10yr: number | null;
  obsYear: string;
}

export interface DenseLayer {
  table: DenseLayerRow[];
  ausSeries: { year: number; value: number }[];
  /** Ruling 2: RankChart folds in here. Ink/chrome only — no colour encodes performance (R1). */
  rankHistory: { year: number; rank: number | null; of: number }[];
  definition: ReactNode;
  revisions?: { date: string; note: string }[];
  sourcesNote: ReactNode;
  maturity: MaturityInfo;
  evidenceStrength?: EvidenceStrength;
  scoringBasisNote?: string | null;
  reuseNote?: string;
  contextSeries?: GaugeData["contextSeries"];
}

interface GaugeViewBase {
  plate: string;
  slug: string;
  section: 1 | 2;
  title: string;
  unitLine: string;
  asOf: string;
  stale: boolean;
  staleReason?: string;
  refreshNote: string;
  observation: string;
  /** Tier 1, --stamp, never behind the dense-layer toggle (Ruling D). */
  isSampleData: boolean;
  /** Draft content — see content/register-draft-lines.ts. UNREVIEWED until edited. */
  plainLine: ReactNode;
  /** Null only ever reachable on the unscored branch, for a gauge with no data at all yet. */
  aus: { value: number | null };
  cause: Attribution;
  precedent: Attribution;
  scale: ReactNode;
  dense: DenseLayer;
}

export interface ScoredGauge extends GaugeViewBase {
  scored: true;
  aus: { value: number; score: number };
  bands: Band[];
  ausBand: string;
  rank: string;
  delta: string;
  peerMedian: number | null;
  /** FIX 1 — non-empty by construction. R3 is a type-level invariant, not a rendering convention; see assertMinimumPeerCoverage for the build-level half of that. */
  peers: [Peer, ...Peer[]];
  missingPeers: MissingPeer[];
  invertedAxis?: boolean;
  leads?: boolean;
  axisOutlier?: AxisOutlier;
  bandRobustness?: {
    alternateBandLabel: string;
    dependsOnCountryName: string;
    methodsRef: string;
    /** Only "overstates" renders a reader-facing qualifier (Fix 3). */
    direction: "overstates" | "understates";
  };
}

export interface UnscoredGauge extends GaugeViewBase {
  scored: false;
  reason: string;
}

/**
 * FIX 2 — discriminated on `scored`. It is a type error to read `ausBand`,
 * `bands`, `rank`, `peers`, etc. on a gauge that hasn't narrowed to
 * `scored: true` first: there is no band machinery to accidentally render
 * for S7, because there is no field to reach for.
 */
export type GaugeView = ScoredGauge | UnscoredGauge;

// ---------------------------------------------------------------------------
// Build-level invariant: peer context is never optional (R3).
// ---------------------------------------------------------------------------

export const MIN_PEERS_FOR_SCORING = 3;

/**
 * The actual enforcement, not just a type. Called by buildGaugeView for
 * every scored gauge; throwing here fails `next build` (same pattern as
 * assertCompositeDisclosure in lib/scoring.ts) rather than shipping a page
 * that typechecks but has no real peer context. Also run standalone,
 * pre-build, by scripts/verify-gauge-invariants.mjs — see that file for
 * why the check exists twice.
 *
 * Narrows to the weaker `[Peer, ...Peer[]]` (non-empty, ≥1 — the type-level
 * half of R3) as a side effect of enforcing the stronger ≥3 rule (the
 * build-level half — rank/median/"position among peers" are incoherent
 * below 3). Two different thresholds, deliberately: the type only promises
 * "never empty," the assertion promises "never too thin to be coherent."
 */
export function assertMinimumPeerCoverage(gaugeId: string, peers: Peer[]): asserts peers is [Peer, ...Peer[]] {
  if (peers.length < MIN_PEERS_FOR_SCORING) {
    throw new Error(
      `${gaugeId}: only ${peers.length} peer(s) with a usable score after missingPeers exclusion — ` +
        `rank, median, and "position among peers" are incoherent below ${MIN_PEERS_FOR_SCORING}. ` +
        `This gauge needs an S4 (missing peer data) or S7 (unscored) treatment, not a normal scored render.`
    );
  }
}

// ---------------------------------------------------------------------------
// Axis outlier resolution — derived from real values, never config, never
// defaulted to one side (see the personal-safety/life-expectancy reminder).
// ---------------------------------------------------------------------------

export function resolveAxisOutlier(
  peers: Peer[],
  outlierCountry: CountryCode,
  polarity: Polarity,
  valueScale: "ratio" | "interval",
  unit: string
): AxisOutlier | null {
  const outlier = peers.find((p) => p.code === outlierCountry);
  const rest = peers.filter((p) => p.code !== outlierCountry);
  if (!outlier || rest.length === 0) return null;

  const restValues = rest.map((p) => p.value);
  const restMax = Math.max(...restValues);
  const restMin = Math.min(...restValues);
  const isHighExtreme = outlier.value >= restMax;
  const isLowExtreme = outlier.value <= restMin;

  if (!isHighExtreme && !isLowExtreme) {
    // The named country isn't actually extreme in this year's data — a
    // config/data mismatch (axisTreatment was hand-set against different
    // data than is live now), not something to silently paper over by
    // guessing an end. Loud failure, matching this project's existing
    // "fail rather than mislead" convention (see the truncation guard).
    // This throws inside buildGaugeView, which every consuming page calls
    // during its own render — under `output: "export"` there is no
    // request-time render at all, only build-time static generation, so
    // this failure can only ever surface as a failed `next build`, never
    // a broken page served to a reader. Verified live, not just reasoned:
    // see CLAUDE.md for the deliberate misconfiguration test that
    // confirmed this exact throw fails the build.
    throw new Error(
      `axisTreatment.outlierCountry ${outlierCountry} is not actually the min or max among this gauge's ` +
        `peers (value ${outlier.value}, field runs ${restMin}–${restMax}) — axisTreatment config is stale ` +
        `against current data. Re-check which country is the real outlier before shipping this gauge.`
    );
  }

  const nextClosest = isHighExtreme ? restMax : restMin;
  const highEndIs: "ahead" | "behind" = polarity === "higher_is_better" ? "ahead" : "behind";
  const lowEndIs: "ahead" | "behind" = polarity === "higher_is_better" ? "behind" : "ahead";

  const comparison: OutlierComparison =
    valueScale === "ratio"
      ? { comparison: "ratio", multiple: nextClosest !== 0 ? Math.round((outlier.value / nextClosest) * 10) / 10 : NaN }
      : { comparison: "absolute-gap", gap: Math.round((outlier.value - nextClosest) * 100) / 100, unit };

  return {
    code: outlier.code,
    name: outlier.name,
    value: outlier.value,
    comparison,
    endsAt: isHighExtreme ? highEndIs : lowEndIs,
  };
}

// ---------------------------------------------------------------------------
// Trend framing — the zero-crossing/near-zero guard (Fix A's lesson one
// level up, made a code rule rather than a drafting caution).
// ---------------------------------------------------------------------------

export type TrendFramingResult =
  | { kind: "pct"; totalPctChange: number }
  | { kind: "absolute"; delta: number };

/**
 * A percentage change computed against a start value near zero, or across
 * a sign change, is a denominator artifact, not a real magnitude — e.g.
 * external-position USA (0.07 → −3.63) computes as −4972%, and
 * internal-cohesion KOR (−0.043 → 1.438) as +3444%. Neither number means
 * anything, even though both trajectories are real. This exists as code,
 * not a note in a drafting guide, because whoever reads a generated
 * trajectory table later has no way to know to distrust a specific cell —
 * the guard has to already have run before the number reaches them.
 */
const NEAR_ZERO_FRACTION_OF_SERIES_RANGE = 0.1;

export function resolveTrendFraming(
  seriesValuesForScale: number[],
  startValue: number,
  endValue: number
): TrendFramingResult {
  const crossesZero = startValue !== 0 && endValue !== 0 && Math.sign(startValue) !== Math.sign(endValue);
  const maxAbs = Math.max(0, ...seriesValuesForScale.map((v) => Math.abs(v)), Math.abs(startValue), Math.abs(endValue));
  const nearZero = maxAbs > 0 && Math.abs(startValue) < NEAR_ZERO_FRACTION_OF_SERIES_RANGE * maxAbs;

  if (startValue === 0 || crossesZero || nearZero) {
    return { kind: "absolute", delta: Math.round((endValue - startValue) * 100) / 100 };
  }
  const totalPctChange = ((endValue - startValue) / Math.abs(startValue)) * 100;
  return { kind: "pct", totalPctChange: Math.round(totalPctChange * 10) / 10 };
}

/**
 * For a future PRECEDENT: how much did a given peer's own value move over
 * its full available history? NOT called from buildGaugeView yet — no
 * gauge has drafted PRECEDENT content (the site owner's explicit hold, to
 * see how the Korea story reads once before it's written across five
 * gauges). Built now so the guard above is load-bearing by the time that
 * drafting happens, not something a future pass has to remember to add.
 */
export function computePeerTrajectory(
  data: GaugeData,
  peerCode: CountryCode
): {
  code: CountryCode;
  name: string;
  startYear: number;
  endYear: number;
  startValue: number;
  endValue: number;
  framing: TrendFramingResult;
} | null {
  const country = data.countries[peerCode];
  if (!country || country.series.length < 2) return null;
  const sorted = [...country.series].sort((a, b) => a.year - b.year);
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  const framing = resolveTrendFraming(
    sorted.map((p) => p.value),
    start.value,
    end.value
  );
  return { code: peerCode, name: country.name, startYear: start.year, endYear: end.year, startValue: start.value, endValue: end.value, framing };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function buildBands(scoreBands: GaugesConfigFile["scoreBands"]): Band[] {
  const sorted = [...scoreBands].sort((a, b) => a.min - b.min);
  return sorted.map((b) => ({
    key: b.id,
    label: b.label,
    ticks: b.ticks,
    min: b.min,
    max: b.max,
    widthPct: Math.round(((b.max - b.min + 1) / 101) * 1000) / 10,
  }));
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export interface BuildGaugeViewArgs {
  config: GaugeConfig;
  data: GaugeData | null;
  gaugesConfig: GaugesConfigFile;
  dimensionId: DimensionId;
  plate: string;
  section: 1 | 2;
  plainLine: ReactNode;
  definition: ReactNode;
  sourcesNote: ReactNode;
  revisions?: { date: string; note: string }[];
  /** Defaults to NOT_ESTABLISHED — most gauges have no drafted CAUSE yet. See content/register-draft-lines.ts for the ones that do. */
  cause?: Attribution;
  /** Defaults to NOT_ESTABLISHED. No gauge has drafted PRECEDENT content yet, deliberately — see the site owner's ruling on drafting the Korea story once, not five times. */
  precedent?: Attribution;
}

export function buildGaugeView(args: BuildGaugeViewArgs): GaugeView {
  const {
    config,
    data,
    gaugesConfig,
    dimensionId,
    plate,
    section,
    plainLine,
    definition,
    sourcesNote,
    revisions,
    cause = NOT_ESTABLISHED,
    precedent = NOT_ESTABLISHED,
  } = args;

  const isUnscored = (config.unscoredDimensions ?? []).includes(dimensionId);
  const maturity = computeMaturity(config, data);
  const staleness = data ? manualStaleness(config, data) : null;

  const base = {
    plate,
    slug: config.id,
    section,
    title: config.name,
    unitLine: config.unit,
    asOf: data?.provenance.retrievedAt?.slice(0, 10) ?? "—",
    stale: staleness?.stale ?? false,
    staleReason: config.staleDisclosure,
    refreshNote:
      config.accessType === "manual"
        ? "manual lane · no unattended refresh"
        : "refreshes monthly on the scheduled pipeline run",
    observation: data?.provenance.seriesName ?? config.source.seriesName,
    isSampleData: data?.provenance.status === "SAMPLE_DATA",
    plainLine,
    cause,
    precedent,
  };

  if (isUnscored) {
    const view: UnscoredGauge = {
      ...base,
      scored: false,
      aus: { value: data?.countries.AUS?.series.at(-1)?.value ?? null },
      reason: config.unscoredReason ?? "This gauge is not scored — see its own page for why.",
      scale: "Not applicable — SCALE expresses a peer-relative gap, which an unscored gauge does not have.",
      dense: {
        table: [],
        ausSeries: data?.countries.AUS?.series ?? [],
        rankHistory: [],
        definition,
        revisions,
        sourcesNote,
        maturity,
        evidenceStrength: config.evidenceStrength,
        scoringBasisNote: describeScoringBasis(config),
        reuseNote: config.reuseNote,
        contextSeries: data?.contextSeries,
      },
    };
    return view;
  }

  if (!data) {
    throw new Error(
      `${config.id}: buildGaugeView called for dimension "${dimensionId}" with no data at all — this gauge ` +
        `is Awaiting Data and should route through the maturity "no data yet" branch, not through a scored view.`
    );
  }

  const usesLatestWaveBasis = config.scoringBasis === "latest-wave-per-country";
  const year = usesLatestWaveBasis ? null : latestSharedYear(data);
  if (!usesLatestWaveBasis && year === null) {
    throw new Error(`${config.id}: no latestSharedYear could be computed — cannot build a scored view.`);
  }

  const allScores = usesLatestWaveBasis
    ? computeLevelScoreForAllCountriesLatestWave(data, config)
    : computeLevelScoreForAllCountries(data, config, year!);

  const ausScoreEntry = allScores.find((p) => p.code === "AUS");
  const ausScore = ausScoreEntry?.score ?? null;
  const ausRawValue = usesLatestWaveBasis
    ? data.countries.AUS?.series.at(-1)?.value ?? null
    : data.countries.AUS?.series.find((p) => p.year === year)?.value ?? null;

  if (ausScore === null || ausRawValue === null) {
    throw new Error(`${config.id}: could not compute Australia's own score/value for dimension "${dimensionId}".`);
  }

  const missingPeers: MissingPeer[] = (data.provenance.missingCountries ?? [])
    .filter((m) => m.code !== "AUS")
    .map((m) => ({ code: m.code, name: m.name, reason: m.reason }));

  const peerEntries = allScores.filter((p) => p.code !== "AUS");
  const peers: Peer[] = peerEntries.map((p) => {
    const raw = usesLatestWaveBasis
      ? data.countries[p.code]?.series.at(-1)?.value
      : data.countries[p.code]?.series.find((pt) => pt.year === year)?.value;
    return { code: p.code, name: p.name, value: raw ?? NaN, score: p.score, asOfYear: p.asOfYear };
  });

  assertMinimumPeerCoverage(config.id, peers); // narrows peers to [Peer, ...Peer[]] below

  const rankInfo = usesLatestWaveBasis
    ? computeRankLatestWavePerCountry(data, config, "AUS")
    : computeRank(data, config, "AUS", year!);
  const totalReporting = 1 + peers.length; // AUS + reporting peers
  const rankLabel = missingPeers.length > 0
    ? `${rankInfo?.rank ?? "—"} OF ${totalReporting} REPORTING`
    : `${rankInfo?.rank ?? "—"}/${rankInfo?.of ?? totalReporting}`;

  const bands = buildBands(gaugesConfig.scoreBands);
  const ausBandObj = bandForScore(ausScore, gaugesConfig.scoreBands);
  if (!ausBandObj) {
    throw new Error(`${config.id}: score ${ausScore} matched no band — see bandForScore in lib/scoring.ts.`);
  }

  const peerMedianRaw = median(peers.map((p) => p.value).filter((v) => !Number.isNaN(v)));

  const rawTrend = !usesLatestWaveBasis && year
    ? computeRawValueTrend(data, "AUS", year, gaugesConfig.directionThresholdPctPerYear)
    : null;
  const deltaLabel = rawTrend
    ? (() => {
        // Same zero-crossing/near-zero guard as computePeerTrajectory —
        // AUS's own trend is just as capable of tripping it as a peer's,
        // even though no gauge currently does (checked before shipping).
        const ausValues = (data.countries.AUS?.series ?? []).map((p) => p.value);
        const framing = resolveTrendFraming(ausValues, rawTrend.startValue, rawTrend.endValue);
        const unitShort = config.unit.split(",")[0].split("(")[0].trim();
        const magnitude =
          framing.kind === "pct"
            ? `${framing.totalPctChange > 0 ? "+" : ""}${framing.totalPctChange}%`
            : `${framing.delta > 0 ? "+" : ""}${framing.delta} ${unitShort}`;
        const direction =
          peerMedianRaw !== null
            ? Math.abs(ausRawValue - peerMedianRaw) > Math.abs(rawTrend.startValue - peerMedianRaw)
              ? "⟶ widening"
              : "⟶ narrowing"
            : "";
        return `Δ ${rawTrend.startYear}–${rawTrend.endYear}: ${magnitude} ${direction}`.trim();
      })()
    : "n.a.";

  const leads = rankInfo?.rank === 1;

  const rank2ndValue = (() => {
    if (!leads) return null;
    const sortedPeerValues = [...peers].sort((a, b) =>
      config.polarity === "higher_is_better" ? b.value - a.value : a.value - b.value
    );
    return sortedPeerValues[0]?.value ?? null;
  })();

  const scale: ReactNode =
    leads && rank2ndValue !== null
      ? `The margin over the next-highest peer is ${Math.round(Math.abs(ausRawValue - rank2ndValue) * 100) / 100} ${config.unit.split(",")[0]}.`
      : peerMedianRaw !== null
        ? `Gap to peer median ≈ ${Math.round(Math.abs(ausRawValue - peerMedianRaw) * 100) / 100} ${config.unit.split(",")[0]}.`
        : "Not enough peer data to compute a scale statement.";

  let axisOutlier: AxisOutlier | undefined;
  if (config.axisTreatment?.mode === "outlier-note" && config.axisTreatment.outlierCountry) {
    if (!config.valueScale) {
      throw new Error(
        `${config.id}: axisTreatment.mode is "outlier-note" but valueScale is unset — required so the ` +
          `sidecar badge knows whether a ratio or an absolute gap is the legible framing for this quantity.`
      );
    }
    axisOutlier =
      resolveAxisOutlier(
        peers,
        config.axisTreatment.outlierCountry,
        config.polarity,
        config.valueScale,
        config.unit.split(",")[0].split("(")[0].trim()
      ) ?? undefined;
  }

  let bandRobustness: ScoredGauge["bandRobustness"];
  if (config.bandRobustness?.status === "outlier-dependent") {
    const alt = gaugesConfig.scoreBands.find((b) => b.id === config.bandRobustness!.alternateBand);
    const dependsOn = gaugesConfig.peerCountries.find((c) => c.code === config.bandRobustness!.dependsOnCountry);
    if (!alt || !dependsOn || !config.bandRobustness.methodsRef || !config.bandRobustness.direction) {
      throw new Error(`${config.id}: bandRobustness is outlier-dependent but missing a required field.`);
    }
    bandRobustness = {
      alternateBandLabel: alt.label,
      dependsOnCountryName: dependsOn.name,
      methodsRef: config.bandRobustness.methodsRef,
      direction: config.bandRobustness.direction,
    };
  }

  const rankHistory = (data.countries.AUS?.series ?? []).map((p) => {
    const r = computeRank(data, config, "AUS", p.year);
    return { year: p.year, rank: r?.rank ?? null, of: r?.of ?? 0 };
  });

  const table: DenseLayerRow[] = [...peers, { code: "AUS" as CountryCode, name: "Australia", value: ausRawValue, score: ausScore }]
    .sort((a, b) => (config.polarity === "higher_is_better" ? b.value - a.value : a.value - b.value))
    .map((p) => ({
      code: p.code,
      name: p.name,
      primary: p.value,
      delta10yr: null,
      obsYear: p.code === "AUS" && !usesLatestWaveBasis ? String(year) : String(p.asOfYear ?? year ?? ""),
    }));

  const view: ScoredGauge = {
    ...base,
    scored: true,
    aus: { value: ausRawValue, score: ausScore },
    bands,
    ausBand: ausBandObj.id,
    rank: rankLabel,
    delta: deltaLabel,
    peerMedian: peerMedianRaw,
    peers,
    missingPeers,
    invertedAxis: config.polarity === "lower_is_better",
    leads,
    axisOutlier,
    bandRobustness,
    scale,
    dense: {
      table,
      ausSeries: data.countries.AUS?.series ?? [],
      rankHistory,
      definition,
      revisions,
      sourcesNote,
      maturity,
      evidenceStrength: config.evidenceStrength,
      scoringBasisNote: describeScoringBasis(config),
      reuseNote: config.reuseNote,
      contextSeries: data.contextSeries,
    },
  };
  return view;
}
