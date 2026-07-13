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
  source: {
    institution: string;
    seriesId: string;
    seriesName: string;
    url: string;
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
