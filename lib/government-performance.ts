import { computeLevelScore } from "@/lib/scoring";
import { latestDataYear } from "@/lib/maturity";
import type { GaugeConfig, GaugeData } from "@/lib/types";

/**
 * Government-performance surface — its own page (see app/government-
 * performance/page.tsx), never a third dimension, never in either
 * composite. Everything here is arithmetic on data that already exists in
 * data/processed/*.json, run at build/request time — nothing on the page
 * this module feeds is a hand-typed number. See docs/government-
 * performance-memo.pdf for the scoping memo and METHODOLOGY.md's
 * "Government performance across the gauges" ruling for why the page
 * exists and what it does and doesn't claim.
 */

// ---------------------------------------------------------------------------
// Government terms — party-continuity blocks, per the memo's Question 1
// ruling. Dates are historical fact, not derived from gauge data (the same
// kind of fixed, hand-checked constant peerCountries already is in
// gauges.config.json) — cross-checked against the National Archives of
// Australia's prime ministers record, Wikipedia, and AustralianPolitics.com,
// none of which disagreed. Individual-PM dates are kept alongside each term
// (a labelled sub-partition, per the memo's recommendation) rather than
// discarded, so a reader can see which PM held office when without the page
// treating any one PM as its comparison unit.
// ---------------------------------------------------------------------------

export interface PmEntry {
  name: string;
  start: string; // ISO date
  end: string | null; // null only for the currently serving PM
}

export interface GovernmentTerm {
  id: string;
  name: string;
  party: "Labor" | "Coalition";
  start: string; // ISO date the term began
  end: string | null; // ISO date the term ended, or null if still in office
  pmSequence: PmEntry[];
}

export const GOVERNMENT_TERMS: readonly GovernmentTerm[] = [
  {
    id: "hawke-keating",
    name: "Hawke–Keating",
    party: "Labor",
    start: "1983-03-11",
    end: "1996-03-11",
    pmSequence: [
      { name: "Bob Hawke", start: "1983-03-11", end: "1991-12-20" },
      { name: "Paul Keating", start: "1991-12-20", end: "1996-03-11" },
    ],
  },
  {
    id: "howard",
    name: "Howard",
    party: "Coalition",
    start: "1996-03-11",
    end: "2007-12-03",
    pmSequence: [{ name: "John Howard", start: "1996-03-11", end: "2007-12-03" }],
  },
  {
    id: "rudd-gillard-rudd",
    name: "Rudd–Gillard–Rudd",
    party: "Labor",
    start: "2007-12-03",
    end: "2013-09-18",
    pmSequence: [
      { name: "Kevin Rudd", start: "2007-12-03", end: "2010-06-24" },
      { name: "Julia Gillard", start: "2010-06-24", end: "2013-06-27" },
      { name: "Kevin Rudd", start: "2013-06-27", end: "2013-09-18" },
    ],
  },
  {
    id: "abbott-turnbull-morrison",
    name: "Abbott–Turnbull–Morrison",
    party: "Coalition",
    start: "2013-09-18",
    end: "2022-05-23",
    pmSequence: [
      { name: "Tony Abbott", start: "2013-09-18", end: "2015-09-15" },
      { name: "Malcolm Turnbull", start: "2015-09-15", end: "2018-08-24" },
      { name: "Scott Morrison", start: "2018-08-24", end: "2022-05-23" },
    ],
  },
  {
    id: "albanese",
    name: "Albanese",
    party: "Labor",
    start: "2022-05-23",
    end: null,
    pmSequence: [{ name: "Anthony Albanese", start: "2022-05-23", end: null }],
  },
] as const;

export function isOngoing(term: GovernmentTerm): boolean {
  return term.end === null;
}

/** The one term with `end: null` — there is always exactly one, the most recently formed government. */
export function getOpenTerm(): GovernmentTerm {
  const open = GOVERNMENT_TERMS.find(isOngoing);
  if (!open) throw new Error("government-performance: no government term is marked ongoing (end: null) — exactly one must be.");
  return open;
}

/**
 * This site's own documented composite floor (METHODOLOGY.md's "Trajectory
 * series fix" / CLAUDE.md's computeHistoricalComposite entry): before 1990,
 * only 2–4 gauges have data at all, too thin to be representative. Applied
 * here for the same reason — Hawke–Keating's real term starts 1983, seven
 * years before this floor, so this page's own numbers for that government
 * cover only its last 6.8 of 13 years. Disclosed on the page, not hidden.
 */
export const COMPOSITE_FLOOR_YEAR = 1990;

/** Calendar-year bounds for display (the term's real historical span, not floored). */
export function termYearBounds(term: GovernmentTerm): { startYear: number; endYear: number } {
  const startYear = new Date(term.start).getFullYear();
  const endYear = term.end ? new Date(term.end).getFullYear() : new Date().getFullYear();
  return { startYear, endYear };
}

/** Calendar-year bounds for gauge-score computation — floored at COMPOSITE_FLOOR_YEAR, matching computeHistoricalComposite's own convention. */
export function termYearBoundsForScoring(term: GovernmentTerm): { startYear: number; endYear: number } {
  const { startYear, endYear } = termYearBounds(term);
  return { startYear: Math.max(startYear, COMPOSITE_FLOOR_YEAR), endYear };
}

const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

/** Precise (day-resolution) term length in years — for the currently open term this is computed against "now" at render time, so it never goes stale between rebuilds. */
export function termLengthYears(term: GovernmentTerm): number {
  const start = new Date(term.start).getTime();
  const end = term.end ? new Date(term.end).getTime() : Date.now();
  return Math.round(((end - start) / MS_PER_YEAR) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Headline / "north star" gauge set — the memo's Question 2 picks. A
// curated subset for legibility, never shown without the full-23 comparison
// beside it (memo ruling) — enforced on the page, not here; this file just
// names the set.
// ---------------------------------------------------------------------------

export const HEADLINE_GAUGE_IDS: readonly string[] = [
  "living-standards",
  "housing-pressure",
  "inequality",
  "debt-burden",
  "education",
  "personal-safety",
  "life-satisfaction",
  "internal-cohesion",
];

// ---------------------------------------------------------------------------
// Per-gauge, per-term statistics
// ---------------------------------------------------------------------------

export interface GaugeTermStat {
  firstYear: number;
  lastYear: number;
  firstScore: number;
  lastScore: number;
  /** null when only one score-computable observation falls in the term — a change can't be stated from one point. */
  deltaScore: number | null;
  /** null whenever deltaScore is null. Points per year. */
  annualized: number | null;
  /** The level score at the last available year in the term — always present whenever any observation exists, regardless of whether a delta can be computed. */
  endLevel: number;
  nObsInTerm: number;
}

/**
 * One gauge's stat for one government term. Mirrors computeLevelScore
 * exactly (imported, not reimplemented) — the only new logic here is
 * selecting which of Australia's own real observation years fall inside
 * the term's [startYear, endYear] window and computing the delta/rate
 * between the first and last of them. "Real observation years" means years
 * where computeLevelScore actually returns a score (≥2 countries with
 * data that year), not merely years AUS's raw series has a point for —
 * the two can differ when a peer set is thin.
 */
export function computeGaugeTermStat(
  data: GaugeData,
  config: GaugeConfig,
  termStartYear: number,
  termEndYear: number
): GaugeTermStat | null {
  const ausRawYears = data.countries.AUS?.series.map((p) => p.year) ?? [];
  const scorable = ausRawYears
    .filter((y) => y >= termStartYear && y <= termEndYear)
    .map((y) => ({ year: y, score: computeLevelScore(data, config, "AUS", y) }))
    .filter((p): p is { year: number; score: number } => p.score !== null)
    .sort((a, b) => a.year - b.year);

  if (scorable.length === 0) return null;

  const first = scorable[0];
  const last = scorable[scorable.length - 1];
  const deltaScore = scorable.length >= 2 ? Math.round((last.score - first.score) * 10) / 10 : null;
  const annualized =
    deltaScore !== null && last.year !== first.year
      ? Math.round((deltaScore / (last.year - first.year)) * 100) / 100
      : null;

  return {
    firstYear: first.year,
    lastYear: last.year,
    firstScore: first.score,
    lastScore: last.score,
    deltaScore,
    annualized,
    endLevel: last.score,
    nObsInTerm: scorable.length,
  };
}

/** Every gauge, every term — the one computation the whole page reads from. */
export function computeAllTermStats(
  gaugesWithData: { config: GaugeConfig; data: GaugeData }[]
): Record<string, Record<string, GaugeTermStat | null>> {
  const result: Record<string, Record<string, GaugeTermStat | null>> = {};
  for (const term of GOVERNMENT_TERMS) {
    const { startYear, endYear } = termYearBoundsForScoring(term);
    result[term.id] = {};
    for (const { config, data } of gaugesWithData) {
      result[term.id][config.id] = computeGaugeTermStat(data, config, startYear, endYear);
    }
  }
  return result;
}

function isDeltaComputable(stat: GaugeTermStat | null): stat is GaugeTermStat & { deltaScore: number } {
  return stat !== null && stat.deltaScore !== null;
}

// ---------------------------------------------------------------------------
// The three published statistics, rolled up per government — memo's
// Question 7 / ruling item 1: all three shown together, no winner picked.
// ---------------------------------------------------------------------------

export interface TermRollup {
  termId: string;
  improving: number;
  declining: number;
  flat: number;
  net: number;
  /** Gauges with a computable delta — the denominator for improving+declining+flat. */
  nDelta: number;
  avgAnnual: number | null;
  avgEnd: number | null;
  /** Gauges with any observation at all — the denominator for avgEnd, always ≥ nDelta. */
  nEnd: number;
}

/**
 * Classifies improving/declining/flat by the ANNUALISED rate against the
 * site's own existing direction threshold
 * (gaugesConfig.directionThresholdScorePointsPerYear, currently 0.5
 * points/year) — the same basis computePeerRelativeTrend already uses
 * everywhere else on the site (gauge cards, dot strips, What's Moving),
 * not a new threshold invented for this page. Deliberately NOT the raw
 * (un-annualised) deltaScore: an earlier draft of this function classified
 * by raw delta here while GovTermCell's glyph classified by annualised
 * rate, so the two disagreed on gauges with a small total move over a long
 * term (e.g. trade: +0.1 total over 6 years reads "improving" on a raw
 * basis but is flat at 0.02 points/year, well under any real threshold).
 * One basis, everywhere on this page, matching the one already used
 * everywhere else on the site.
 */
export function computeRollup(
  gaugeIds: readonly string[],
  allStats: Record<string, Record<string, GaugeTermStat | null>>,
  thresholdScorePointsPerYear: number
): TermRollup[] {
  return GOVERNMENT_TERMS.map((term) => {
    let improving = 0;
    let declining = 0;
    let flat = 0;
    let nDelta = 0;
    let sumAnnual = 0;
    let sumEnd = 0;
    let nEnd = 0;

    for (const id of gaugeIds) {
      const stat = allStats[term.id][id];
      if (!stat) continue;
      sumEnd += stat.endLevel;
      nEnd++;
      if (!isDeltaComputable(stat)) continue;
      nDelta++;
      const rate = stat.annualized!;
      sumAnnual += rate;
      if (rate > thresholdScorePointsPerYear) improving++;
      else if (rate < -thresholdScorePointsPerYear) declining++;
      else flat++;
    }

    return {
      termId: term.id,
      improving,
      declining,
      flat,
      net: improving - declining,
      nDelta,
      avgAnnual: nDelta > 0 ? Math.round((sumAnnual / nDelta) * 100) / 100 : null,
      avgEnd: nEnd > 0 ? Math.round((sumEnd / nEnd) * 10) / 10 : null,
      nEnd,
    };
  });
}

export type ComparisonStatistic = "net" | "avgAnnual" | "avgEnd";

export const COMPARISON_STATISTIC_LABELS: Record<ComparisonStatistic, string> = {
  net: "Net gauges improving − declining",
  avgAnnual: "Average annualised change (points/year)",
  avgEnd: "Average level reached by term's end (0–100)",
};

/** Governments ranked highest-first on one statistic, skipping any with no computable value under it. */
export function rankTerms(rollups: TermRollup[], statistic: ComparisonStatistic): string[] {
  return rollups
    .map((r) => ({ termId: r.termId, value: statistic === "net" ? r.net : r[statistic] }))
    .filter((r): r is { termId: string; value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value)
    .map((r) => r.termId);
}

// ---------------------------------------------------------------------------
// Coverage — memo's Question 3 ruling: a gauge appears for a term only if
// it has real coverage; gaps declared, never silently omitted.
// ---------------------------------------------------------------------------

export interface TermCoverage {
  termId: string;
  anyDataCount: number;
  deltaComputableCount: number;
  entirelyAbsentIds: string[];
  /** Has ≥1 observation but not enough to compute a change from. */
  singleObservationIds: string[];
}

export function computeCoverageTable(
  gaugeIds: readonly string[],
  allStats: Record<string, Record<string, GaugeTermStat | null>>
): TermCoverage[] {
  return GOVERNMENT_TERMS.map((term) => {
    const entirelyAbsentIds: string[] = [];
    const singleObservationIds: string[] = [];
    let deltaComputableCount = 0;
    for (const id of gaugeIds) {
      const stat = allStats[term.id][id];
      if (!stat) {
        entirelyAbsentIds.push(id);
      } else if (stat.deltaScore === null) {
        singleObservationIds.push(id);
      } else {
        deltaComputableCount++;
      }
    }
    return {
      termId: term.id,
      anyDataCount: gaugeIds.length - entirelyAbsentIds.length,
      deltaComputableCount,
      entirelyAbsentIds,
      singleObservationIds,
    };
  });
}

/** Gauges with a computable delta in every single term — the memo's Question 3 robustness set, used only as a secondary check, never as the headline comparison (restricting to it doesn't stabilise the ranking — see the memo). */
export function computeCommonCoverageGaugeIds(
  gaugeIds: readonly string[],
  allStats: Record<string, Record<string, GaugeTermStat | null>>
): string[] {
  return gaugeIds.filter((id) => GOVERNMENT_TERMS.every((term) => isDeltaComputable(allStats[term.id][id])));
}

// ---------------------------------------------------------------------------
// The open-term (currently: Albanese) precondition — memo's Question 4
// ruling: this goes at the top of the page, before any table, not a caveat.
// ---------------------------------------------------------------------------

export interface OpenTermPrecondition {
  term: GovernmentTerm;
  termLengthYears: number;
  totalGaugeCount: number;
  /** Gauges with literally no observation since the term began. */
  zeroObservationGaugeIds: string[];
  /** For each zero-observation gauge, the latest year Australia has ANY real data on file (from a prior term) — "whose term this data actually describes". */
  zeroObservationLastRealYear: Record<string, number | null>;
  singleObservationGaugeIds: string[];
  coveredGaugeIds: string[];
  /** Average (lastYear − firstYear) across gauges with any observation in the term — how much of the term a typical covered gauge's data actually spans, not the term's own calendar length. */
  avgCoverageSpanYears: number | null;
}

export function computeOpenTermPrecondition(
  gaugeIds: readonly string[],
  allStats: Record<string, Record<string, GaugeTermStat | null>>,
  gaugesWithData: { config: GaugeConfig; data: GaugeData }[]
): OpenTermPrecondition {
  const term = getOpenTerm();
  const zeroObservationGaugeIds: string[] = [];
  const zeroObservationLastRealYear: Record<string, number | null> = {};
  const singleObservationGaugeIds: string[] = [];
  const coveredGaugeIds: string[] = [];
  let sumSpan = 0;
  let nSpan = 0;

  for (const id of gaugeIds) {
    const stat = allStats[term.id][id];
    if (!stat) {
      zeroObservationGaugeIds.push(id);
      const gd = gaugesWithData.find((g) => g.config.id === id)?.data ?? null;
      zeroObservationLastRealYear[id] = latestDataYear(gd);
      continue;
    }
    nSpan++;
    sumSpan += stat.lastYear - stat.firstYear;
    if (stat.deltaScore === null) singleObservationGaugeIds.push(id);
    else coveredGaugeIds.push(id);
  }

  return {
    term,
    termLengthYears: termLengthYears(term),
    totalGaugeCount: gaugeIds.length,
    zeroObservationGaugeIds,
    zeroObservationLastRealYear,
    singleObservationGaugeIds,
    coveredGaugeIds,
    avgCoverageSpanYears: nSpan > 0 ? Math.round((sumSpan / nSpan) * 10) / 10 : null,
  };
}

/**
 * The precondition sentence AND the numbers it states are built from the
 * same object in one pass — there is no second, independently-typed copy of
 * "3 gauges" anywhere for the two to drift apart from. Verified anyway via
 * assertOpenTermPreconditionDisclosure below, the same discipline
 * assertCompositeDisclosure already applies to the composite-exclusion
 * text (lib/scoring.ts) — a silently un-named gauge is a worse failure than
 * a page that refuses to build.
 */
export function buildOpenTermPreconditionDisclosure(
  precondition: OpenTermPrecondition,
  configs: GaugeConfig[]
): string {
  const names = precondition.zeroObservationGaugeIds.map((id) => configs.find((c) => c.id === id)?.name ?? id);
  const zeroCount = precondition.zeroObservationGaugeIds.length;
  const singleCount = precondition.singleObservationGaugeIds.length;
  const spanText =
    precondition.avgCoverageSpanYears !== null ? precondition.avgCoverageSpanYears.toFixed(1) : "no";

  return (
    `${zeroCount} of ${precondition.totalGaugeCount} gauges${names.length > 0 ? ` (${names.join(", ")})` : ""} ` +
    `${zeroCount === 1 ? "has" : "have"} published nothing at all since this government's term began — ` +
    `${zeroCount === 1 ? "its" : "their"} most recent figures describe the government before it. ` +
    `A further ${singleCount} gauge${singleCount === 1 ? "" : "s"} ${singleCount === 1 ? "has" : "have"} only the ` +
    `term's opening data point. The rest average ${spanText} years of coverage inside a term that has now run ` +
    `${precondition.termLengthYears.toFixed(1)} years. This is the least measurable of the five governments on ` +
    `this page — read anything below as a partial record, not a verdict.`
  );
}

export function assertOpenTermPreconditionDisclosure(
  precondition: OpenTermPrecondition,
  configs: GaugeConfig[],
  renderedText: string
): void {
  for (const id of precondition.zeroObservationGaugeIds) {
    const name = configs.find((c) => c.id === id)?.name ?? id;
    if (!renderedText.includes(name)) {
      throw new Error(
        `Government-performance page integrity violation: "${name}" has zero observations in the open ` +
          `term but is not named in the rendered precondition text ("${renderedText}"). Silent omission is ` +
          `never acceptable — see assertOpenTermPreconditionDisclosure in lib/government-performance.ts.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Salience/coverage anti-correlation — memo's Question 2 addition: the
// gauges with the most political charge are structurally the newest and
// shallowest, so the headline set's own coverage should never be quoted
// without this alongside it.
// ---------------------------------------------------------------------------

export interface SalienceCoverageFinding {
  headlineCount: number;
  fullCount: number;
  /** Per term: headline set's delta-computable fraction vs the full set's. */
  rows: {
    termId: string;
    headlineDeltaComputable: number;
    headlineFraction: number;
    fullDeltaComputable: number;
    fullFraction: number;
  }[];
}

export function computeSalienceCoverageFinding(
  allGaugeIds: readonly string[],
  headlineGaugeIds: readonly string[],
  allStats: Record<string, Record<string, GaugeTermStat | null>>
): SalienceCoverageFinding {
  const headlineCoverage = computeCoverageTable(headlineGaugeIds, allStats);
  const fullCoverage = computeCoverageTable(allGaugeIds, allStats);

  return {
    headlineCount: headlineGaugeIds.length,
    fullCount: allGaugeIds.length,
    rows: GOVERNMENT_TERMS.map((term, i) => ({
      termId: term.id,
      headlineDeltaComputable: headlineCoverage[i].deltaComputableCount,
      headlineFraction: headlineCoverage[i].deltaComputableCount / headlineGaugeIds.length,
      fullDeltaComputable: fullCoverage[i].deltaComputableCount,
      fullFraction: fullCoverage[i].deltaComputableCount / allGaugeIds.length,
    })),
  };
}
