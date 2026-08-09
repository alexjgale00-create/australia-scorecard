export type Polarity = "higher_is_better" | "lower_is_better";

export type AccessType = "api" | "manual";

/**
 * Phase E: the site scores two independent dimensions — "power" (national
 * trajectory, the original 16-gauge composite) and "quality-of-life" (is
 * Australia still a good place to live). They share every mechanism
 * (scoring, maturity, provenance) but are never combined into one number —
 * see METHODOLOGY.md's "Quality of Life dimension" section.
 */
export type DimensionId = "power" | "quality-of-life";

export interface DimensionConfig {
  id: DimensionId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
}

/**
 * How a gauge's cross-country comparison is built. Almost every gauge uses
 * "same-year" (the default when omitted): every country's value from the
 * same shared year, per latestSharedYear. "latest-wave-per-country" is a
 * deliberate, disclosed departure — each country's own most recent
 * available value is compared, even when countries' values come from
 * different calendar years — used only for attitude-survey gauges whose
 * source fields irregular, non-synchronized waves per country (e.g.
 * cohesion-majority-acceptance's Gallup Migrant Acceptance Index). See
 * describeScoringBasis in lib/scoring.ts and METHODOLOGY.md — this must
 * never be a fact only readable in code, per the site owner's explicit
 * ruling.
 */
export type ScoringBasis = "same-year" | "latest-wave-per-country";

/** Hard statistics are the unmarked default; survey/attitude data gets a quiet "Survey-based" tag — see EvidenceTag. */
export type EvidenceStrength = "hard-statistic" | "survey";

export type CountryCode =
  | "AUS"
  | "CAN"
  | "GBR"
  | "NZL"
  | "KOR"
  | "NLD"
  | "USA"
  | "DEU"
  | "JPN";

export interface GaugeConfig {
  id: string;
  name: string;
  shortName: string;
  oneLiner: string;
  unit: string;
  historyStartYear: number;
  accessType: AccessType;
  polarity: Polarity;
  polarityJustification: string;
  /**
   * Which dimension(s) this gauge feeds, and its weight within each. A
   * gauge with more than one key here is deliberately reused across
   * dimensions (e.g. housing-pressure, scored in both Power and Quality of
   * Life) — always with its own `reuseNote` disclosing why. A dimension not
   * present as a key here simply doesn't include this gauge; that's the
   * single source of truth for dimension membership, not a separate list
   * that could drift out of sync with the weights.
   */
  weights: Partial<Record<DimensionId, number>>;
  /**
   * Set only on a gauge reused across more than one dimension — the
   * disclosure shown on every one of that gauge's dimension pages, plus
   * /status and METHODOLOGY.md, per the site owner's explicit condition
   * that reuse must never be silent.
   */
  reuseNote?: string;
  /** Defaults to "same-year" when omitted — see ScoringBasis. */
  scoringBasis?: ScoringBasis;
  /** Defaults to "hard-statistic" when omitted — see EvidenceStrength. */
  evidenceStrength?: EvidenceStrength;
  /** A source-specific data-handling rule worth surfacing (e.g. excluding forecast years) — shown on the Methodology page alongside polarity. */
  dataPolicy?: string;
  /**
   * Overrides the generic "due for a refresh" staleness copy for a manual
   * gauge whose real state isn't "overdue on a normal cadence" — e.g.
   * cohesion-majority-acceptance, whose last freely-published wave is 7
   * years old because no newer comparable public wave exists, not because
   * anyone forgot to re-download it. Always shown verbatim wherever manual
   * staleness would otherwise render — see lib/maturity.ts.
   */
  staleDisclosure?: string;
  /**
   * For accessType "manual" gauges only: how many months old this gauge's
   * data can get before the monthly pipeline report flags it as due for a
   * refresh. Deliberately per-gauge, not a blanket rule — a 3-4-yearly
   * source (PISA) and an annual one (SIPRI) have very different "stale"
   * thresholds. Falls back to 15 months if omitted.
   */
  staleAfterMonths?: number;
  /**
   * Hand-set maturity override for a gauge whose tier can't be correctly
   * auto-derived from provenance alone — e.g. a standing environment
   * limitation that caps how "established" a gauge can honestly claim to
   * be, even though its data is real and repeatedly refreshed. Only "live"
   * or "provisional" are valid targets: an override can hold a gauge back,
   * never promote it to Established (that must be earned) or fabricate
   * Awaiting data (that's determined by data presence alone). `reason` is
   * mandatory and always displayed on /status — see CLAUDE.md's maturity
   * honesty rules.
   */
  maturityOverride?: {
    tier: "live" | "provisional";
    reason: string;
  };
  source: {
    institution: string;
    seriesId: string;
    seriesName: string;
    url: string;
    /** When a gauge combines multiple raw indicators into one value (e.g. averaging two WGI estimates), lists each contributing series. */
    componentSeriesIds?: { id: string; name: string }[];
  };
}

export interface ScoreBand {
  id: string;
  label: string;
  min: number;
  max: number;
  color: string;
}

export interface GaugesConfigFile {
  peerCountries: { code: CountryCode; name: string }[];
  /** Threshold for the raw-value trend shown in the detail page's "Two ways to read this" block. Not used for the site's primary direction arrows. */
  directionThresholdPctPerYear: number;
  /** Threshold for the peer-relative direction — the primary "improving/flat/deteriorating" basis used everywhere (cards, dot strips, What's Moving). */
  directionThresholdScorePointsPerYear: number;
  /** The two independently-scored dimensions — see DimensionConfig. Order here is display order (Power first, matching the site's original identity). */
  dimensions: DimensionConfig[];
  /** Shared by both dimensions' composites — still provisional pending Phase D, which will decide whether the two dimensions ever need separate bands. */
  scoreBands: ScoreBand[];
  gauges: GaugeConfig[];
}

export type DataStatus = "SAMPLE_DATA" | "LIVE";

export interface SeriesPoint {
  year: number;
  value: number;
}

export interface CountrySeries {
  name: string;
  series: SeriesPoint[];
}

export interface MissingCountry {
  code: CountryCode;
  name: string;
  reason: string;
}

/**
 * A supplementary metric shown alongside a gauge for context — never
 * scored, never part of the composite. Currently used by Inequality (OECD
 * Gini scores the gauge; WID's wealth-share sits here as context) — see
 * CLAUDE.md for why the two weren't blended into one score.
 */
export interface ContextSeries {
  label: string;
  unit: string;
  institution: string;
  url: string;
  retrievedAt: string | null;
  note?: string;
  countries: Partial<Record<CountryCode, CountrySeries>>;
}

export interface GaugeData {
  gaugeId: string;
  provenance: {
    status: DataStatus;
    institution: string;
    seriesId: string;
    seriesName: string;
    url: string;
    retrievedAt: string | null;
    note: string;
    /**
     * Structured record of any of the 9 peer countries this gauge has no
     * usable data for, with a specific reason each. A dot strip or detail
     * page rendering this gauge must surface every entry here — never
     * render a "9-country" visual that's silently missing one.
     */
    missingCountries?: MissingCountry[];
    /**
     * How many times this gauge has been successfully re-fetched by a real,
     * unattended scheduled pipeline run (GITHUB_EVENT_NAME === "schedule")
     * since it first went LIVE — written by pipeline/lib/writeGaugeData.mjs.
     * Deliberately excludes workflow_dispatch and local `npm run pipeline`
     * runs: those prove the fetcher code works, not that it keeps working
     * unattended over real time. See lib/maturity.ts and CLAUDE.md.
     */
    scheduledRefreshCount?: number;
    /** Timestamp of the most recent successful scheduled refresh, or null if none yet. */
    lastScheduledRefreshAt?: string | null;
  };
  countries: Partial<Record<CountryCode, CountrySeries>>;
  /**
   * Optional, gauge-specific — see ContextSeries. Absent for every gauge
   * except where explicitly wired up. An array (not a single block) since
   * Phase E's cohesion-majority-acceptance gauge is planned to carry two
   * (Scanlon Foundation, Australia-only; Eurobarometer, NLD/DEU-only) —
   * see METHODOLOGY.md.
   */
  contextSeries?: ContextSeries[];
}

/**
 * "insufficient-history" is distinct from both "flat" (a real trend was
 * computed and it happens to be small) and null/"no trend data" (no
 * comparable data exists at all) — it means real data exists but too
 * little of it, spaced too irregularly, to trust a computed trend. Currently
 * only reachable via the "latest-wave-per-country" scoring basis — see
 * ScoringBasis and computeGaugeScore in lib/scoring.ts. Must render
 * visually distinct from both neighbours wherever direction is shown — see
 * DirectionArrow.
 */
export type Direction = "improving" | "flat" | "deteriorating" | "insufficient-history";

export interface GaugeScore {
  gaugeId: string;
  latestYear: number;
  levelScore: number | null;
  direction: Direction | null;
  australiaRank: number | null;
  peerCount: number;
}

export interface CountryScorePoint {
  code: CountryCode;
  name: string;
  score: number;
  /**
   * Set only for gauges scored on the "latest-wave-per-country" basis: the
   * calendar year this specific country's value actually comes from, since
   * — unlike every same-year gauge — that year can differ dot to dot.
   * DotStrip shows it in the tooltip when present, so the departure from
   * the site's usual same-year comparison is visible, not just documented.
   */
  asOfYear?: number;
}

export interface LevelScoreDelta {
  startYear: number;
  endYear: number;
  delta: number;
}

/** Purely descriptive (no good/bad judgment) — a raw value going "up" isn't necessarily good; that depends on polarity. */
export type RawDirection = "up" | "down" | "flat";

export interface RawValueTrend {
  startYear: number;
  endYear: number;
  startValue: number;
  endValue: number;
  totalPctChange: number;
  annualizedPct: number;
  direction: RawDirection;
}

export interface PeerRelativeTrend extends LevelScoreDelta {
  annualizedDelta: number;
  direction: Direction;
}

export interface CompositeResult {
  composite: number | null;
  improving: number;
  deteriorating: number;
  flat: number;
  /** Gauge IDs that actually fed the weighted average. */
  includedGaugeIds: string[];
  /**
   * Gauge IDs with a null level score, excluded from the weighted average.
   * Non-empty here obligates the caller to render a disclosure — see
   * buildCompositeDisclosure / assertCompositeDisclosure in lib/scoring.ts.
   * Silent exclusion is never acceptable.
   */
  excludedGaugeIds: string[];
}
