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
  };
  countries: Partial<Record<CountryCode, CountrySeries>>;
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
