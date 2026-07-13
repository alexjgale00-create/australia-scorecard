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

export interface GaugesConfigFile {
  peerCountries: { code: CountryCode; name: string }[];
  directionThresholdPctPerYear: number;
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
