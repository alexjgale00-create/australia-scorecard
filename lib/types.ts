export type Polarity = "higher_is_better" | "lower_is_better";

export type AccessType = "api" | "manual";

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
  weight: number;
  /** A source-specific data-handling rule worth surfacing (e.g. excluding forecast years) — shown on the Methodology page alongside polarity. */
  dataPolicy?: string;
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
  /** Optional, gauge-specific — see ContextSeries. Absent for every gauge except where explicitly wired up. */
  contextSeries?: ContextSeries;
}

export type Direction = "improving" | "flat" | "deteriorating";

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
