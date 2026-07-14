import type {
  CompositeResult,
  CountryCode,
  CountryScorePoint,
  Direction,
  GaugeConfig,
  GaugeData,
  GaugeScore,
  LevelScoreDelta,
  PeerRelativeTrend,
  RawDirection,
  RawValueTrend,
  ScoreBand,
} from "@/lib/types";

/**
 * All scoring here is Phase A / early Phase D: a level score (min-max
 * position within the peer set on the latest shared year) and a direction
 * classification (trailing ~10y annualised change vs a fixed threshold).
 * The composite verdict is a straight weighted average of level scores.
 *
 * "Direction" everywhere on the site (cards, dot strips, What's Moving) is
 * PEER-RELATIVE — it classifies the trend in Australia's level SCORE, not
 * the trend in the raw published number. The two can disagree (e.g. a raw
 * number can rise while the country still loses ground to faster-improving
 * peers). The raw-value trend is computed separately (computeRawValueTrend)
 * and only surfaced in the "Two ways to read this" block on gauge detail
 * pages. See METHODOLOGY.md.
 */

/**
 * The most recent year we can actually compute Australia's position for:
 * the latest year in Australia's own series that at least one peer also
 * reports. Deliberately NOT the union-max year across all 9 countries — a
 * peer reporting a year Australia hasn't reached yet (e.g. one country's
 * data runs to 2024 while Australia's stops at 2021) must never make
 * Australia's own latest real year look like it has no data.
 */
export function latestSharedYear(data: GaugeData): number | null {
  const ausYears = (data.countries.AUS?.series ?? [])
    .map((p) => p.year)
    .sort((a, b) => b - a);

  for (const year of ausYears) {
    const countriesWithData = Object.values(data.countries).filter((c) =>
      c.series.some((p) => p.year === year)
    ).length;
    if (countriesWithData >= 2) return year;
  }
  return ausYears[0] ?? null;
}

export function computeLevelScore(
  data: GaugeData,
  config: GaugeConfig,
  code: CountryCode,
  year: number
): number | null {
  const values = Object.entries(data.countries)
    .map(([c, series]) => ({
      code: c as CountryCode,
      value: series.series.find((p) => p.year === year)?.value,
    }))
    .filter((v): v is { code: CountryCode; value: number } => v.value !== undefined);

  if (values.length < 2) return null;
  const target = values.find((v) => v.code === code);
  if (!target) return null;

  const nums = values.map((v) => v.value);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (max === min) return 50;

  const raw = (target.value - min) / (max - min);
  const normalized = config.polarity === "higher_is_better" ? raw : 1 - raw;
  return Math.round(normalized * 1000) / 10;
}

export function computeRank(
  data: GaugeData,
  config: GaugeConfig,
  code: CountryCode,
  year: number
): { rank: number; of: number } | null {
  const values = Object.entries(data.countries)
    .map(([c, series]) => ({
      code: c as CountryCode,
      value: series.series.find((p) => p.year === year)?.value,
    }))
    .filter((v): v is { code: CountryCode; value: number } => v.value !== undefined);

  if (values.length < 1) return null;
  const sorted = [...values].sort((a, b) =>
    config.polarity === "higher_is_better" ? b.value - a.value : a.value - b.value
  );
  const idx = sorted.findIndex((v) => v.code === code);
  if (idx === -1) return null;
  return { rank: idx + 1, of: sorted.length };
}

/**
 * The trailing-~10y comparison point: the latest point at or before
 * (latestYear - windowYears), falling back to the earliest point on record
 * if the series doesn't go back that far. Shared by computeRawValueTrend
 * (raw-value % change) and computeLevelScoreDelta (level-score points).
 */
function trailingStartYear(
  series: { year: number; value: number }[],
  latestYear: number,
  windowYears = 10
): number | null {
  if (series.length === 0) return null;
  const targetStartYear = latestYear - windowYears;
  const candidates = series.filter((p) => p.year <= targetStartYear);
  const startPoint =
    candidates.length > 0
      ? candidates.reduce((a, b) => (b.year > a.year ? b : a))
      : series.reduce((a, b) => (a.year < b.year ? a : b));
  return startPoint.year;
}

/**
 * The trend in Australia's own raw published number — purely descriptive
 * (up/down/flat), no good/bad judgment, since that depends on polarity.
 * Used only for the "Two ways to read this" block on gauge detail pages.
 */
export function computeRawValueTrend(
  data: GaugeData,
  code: CountryCode,
  latestYear: number,
  thresholdPctPerYear: number
): RawValueTrend | null {
  const country = data.countries[code];
  if (!country) return null;

  const startYear = trailingStartYear(country.series, latestYear);
  const startPoint = startYear ? country.series.find((p) => p.year === startYear) : null;
  const endPoint = country.series.find((p) => p.year === latestYear);
  if (!startPoint || !endPoint || startPoint.year === endPoint.year || startPoint.value === 0) {
    return null;
  }

  const years = endPoint.year - startPoint.year;
  const totalPctChange = ((endPoint.value - startPoint.value) / Math.abs(startPoint.value)) * 100;
  const annualizedPct = totalPctChange / years;

  const direction: RawDirection =
    annualizedPct > thresholdPctPerYear ? "up" : annualizedPct < -thresholdPctPerYear ? "down" : "flat";

  return {
    startYear: startPoint.year,
    endYear: endPoint.year,
    startValue: startPoint.value,
    endValue: endPoint.value,
    totalPctChange: Math.round(totalPctChange * 10) / 10,
    annualizedPct: Math.round(annualizedPct * 100) / 100,
    direction,
  };
}

/**
 * The trend in Australia's level SCORE (peer-relative position) — this is
 * the site's primary "direction" basis, used everywhere except the "Two
 * ways to read this" block.
 */
export function computePeerRelativeTrend(
  data: GaugeData,
  config: GaugeConfig,
  code: CountryCode,
  latestYear: number,
  thresholdScorePointsPerYear: number
): PeerRelativeTrend | null {
  const delta = computeLevelScoreDelta(data, config, code, latestYear);
  if (!delta) return null;

  const years = delta.endYear - delta.startYear;
  const annualizedDelta = years > 0 ? delta.delta / years : 0;
  const direction: Direction =
    annualizedDelta > thresholdScorePointsPerYear
      ? "improving"
      : annualizedDelta < -thresholdScorePointsPerYear
        ? "deteriorating"
        : "flat";

  return {
    ...delta,
    annualizedDelta: Math.round(annualizedDelta * 100) / 100,
    direction,
  };
}

const TWO_WAYS_TEMPLATES: Record<string, (years: number, shortName: string) => string> = {
  up_improving: (y, n) =>
    `Australia's own ${n} figure and its position relative to peers both improved over the ${y} years.`,
  down_deteriorating: (y, n) =>
    `Australia's own ${n} figure and its position relative to peers both declined over the ${y} years.`,
  flat_flat: (y, n) =>
    `Australia's own ${n} figure and its position relative to peers were both roughly flat over the ${y} years.`,
  up_flat: (y, n) =>
    `Australia's own ${n} figure rose over the ${y} years, while its position relative to peers held roughly steady.`,
  up_deteriorating: (y, n) =>
    `Australia's own ${n} figure rose over the ${y} years, but slower than its peers — so its relative position fell.`,
  down_improving: (y, n) =>
    `Australia's own ${n} figure fell over the ${y} years, but its peers fell further — so its relative position improved.`,
  down_flat: (y, n) =>
    `Australia's own ${n} figure fell over the ${y} years, roughly matching the pace of decline among its peers — its relative position held steady.`,
  flat_improving: (y, n) =>
    `Australia's own ${n} figure was roughly flat over the ${y} years, but its peers fell further behind — so its relative position improved.`,
  flat_deteriorating: (y, n) =>
    `Australia's own ${n} figure was roughly flat over the ${y} years, but its peers pulled ahead — so its relative position fell.`,
};

export function describeTwoWaysToRead(
  rawTrend: RawValueTrend,
  peerTrend: PeerRelativeTrend,
  gaugeShortName: string
): string {
  const years = peerTrend.endYear - peerTrend.startYear;
  const key = `${rawTrend.direction}_${peerTrend.direction}`;
  const template = TWO_WAYS_TEMPLATES[key];
  return template
    ? template(years, gaugeShortName)
    : `Australia's own ${gaugeShortName} figure and its position relative to peers moved differently over the ${years} years — see the charts below for the detail.`;
}

/**
 * Level-score-point movement over the trailing ~10 years (e.g. "-12" means
 * Australia's peer-relative position dropped 12 points on the 0-100 scale)
 * — used for the homepage "what's moving" callout and computePeerRelativeTrend.
 */
export function computeLevelScoreDelta(
  data: GaugeData,
  config: GaugeConfig,
  code: CountryCode,
  latestYear: number
): LevelScoreDelta | null {
  const country = data.countries[code];
  if (!country) return null;

  const startYear = trailingStartYear(country.series, latestYear);
  if (!startYear || startYear === latestYear) return null;

  const startScore = computeLevelScore(data, config, code, startYear);
  const endScore = computeLevelScore(data, config, code, latestYear);
  if (startScore === null || endScore === null) return null;

  return {
    startYear,
    endYear: latestYear,
    delta: Math.round((endScore - startScore) * 10) / 10,
  };
}

/**
 * Bands are contiguous by construction: a score belongs to a band if it's
 * at or above that band's min and below the *next* band's min — except the
 * top band, which is inclusive of its own max. Comparing against each
 * band's own max (the old approach) leaves gaps for any non-integer score
 * strictly between one band's max and the next band's min — scores here
 * are computed to 1 decimal place, so that gap was reachable in practice,
 * not just in theory (confirmed: Australia's own historical composite hit
 * it in 2005, 2006, and 2022 — see CLAUDE.md).
 */
export function bandForScore(score: number, bands: ScoreBand[]): ScoreBand | null {
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  for (let i = 0; i < sorted.length; i++) {
    const band = sorted[i];
    const nextMin = sorted[i + 1]?.min;
    const belowUpperBound = nextMin === undefined ? score <= band.max : score < nextMin;
    if (score >= band.min && belowUpperBound) return band;
  }
  return null;
}

export function computeLevelScoreForAllCountries(
  data: GaugeData,
  config: GaugeConfig,
  year: number
): CountryScorePoint[] {
  return Object.entries(data.countries)
    .map(([code, country]) => {
      const score = computeLevelScore(data, config, code as CountryCode, year);
      return score === null ? null : { code: code as CountryCode, name: country.name, score };
    })
    .filter((p): p is CountryScorePoint => p !== null);
}

export function computeCompositeForAllCountries(
  gaugesData: { data: GaugeData; config: GaugeConfig }[]
): CountryScorePoint[] {
  const allCodes = new Set<CountryCode>();
  for (const { data } of gaugesData) {
    for (const code of Object.keys(data.countries)) allCodes.add(code as CountryCode);
  }

  const points: CountryScorePoint[] = [];
  for (const code of allCodes) {
    let name: string | null = null;
    const weighted: { score: number; weight: number }[] = [];
    for (const { data, config } of gaugesData) {
      const country = data.countries[code];
      if (!country) continue;
      name = country.name;
      const year = latestSharedYear(data);
      const score = year ? computeLevelScore(data, config, code, year) : null;
      if (score !== null) weighted.push({ score, weight: config.weight });
    }
    if (!name || weighted.length === 0) continue;
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    const composite =
      Math.round(
        (weighted.reduce((sum, w) => sum + w.score * w.weight, 0) / totalWeight) * 10
      ) / 10;
    points.push({ code, name, score: composite });
  }
  return points;
}

export function computeGaugeHistoricalLevelScores(
  data: GaugeData,
  config: GaugeConfig,
  code: CountryCode = "AUS"
): { year: number; score: number }[] {
  const country = data.countries[code];
  if (!country) return [];
  return country.series
    .map((p) => {
      const score = computeLevelScore(data, config, code, p.year);
      return score === null ? null : { year: p.year, score };
    })
    .filter((p): p is { year: number; score: number } => p !== null);
}

export function computeGaugeScore(
  data: GaugeData,
  config: GaugeConfig,
  thresholdScorePointsPerYear: number,
  code: CountryCode = "AUS"
): GaugeScore {
  const year = latestSharedYear(data);
  const levelScore = year ? computeLevelScore(data, config, code, year) : null;
  const direction = year
    ? (computePeerRelativeTrend(data, config, code, year, thresholdScorePointsPerYear)?.direction ?? "flat")
    : null;
  const rankInfo = year ? computeRank(data, config, code, year) : null;

  return {
    gaugeId: config.id,
    latestYear: year ?? 0,
    levelScore,
    direction,
    australiaRank: rankInfo?.rank ?? null,
    peerCount: rankInfo?.of ?? 0,
  };
}

export function computeHistoricalComposite(
  gaugesData: { data: GaugeData; config: GaugeConfig }[]
): { year: number; composite: number }[] {
  const allYears = gaugesData
    .flatMap(({ data }) => data.countries.AUS?.series.map((p) => p.year) ?? [])
    .filter((y, i, arr) => arr.indexOf(y) === i)
    .sort((a, b) => a - b);

  const points: { year: number; composite: number }[] = [];
  for (const year of allYears) {
    const weighted = gaugesData
      .map(({ data, config }) => {
        const score = computeLevelScore(data, config, "AUS", year);
        return score === null ? null : { score, weight: config.weight };
      })
      .filter((w): w is { score: number; weight: number } => w !== null);

    if (weighted.length === 0) continue;
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    const composite =
      Math.round(
        (weighted.reduce((sum, w) => sum + w.score * w.weight, 0) / totalWeight) * 10
      ) / 10;
    points.push({ year, composite });
  }
  return points;
}

export function computeComposite(scores: GaugeScore[], configs: GaugeConfig[]): CompositeResult {
  const includedGaugeIds: string[] = [];
  const excludedGaugeIds: string[] = [];
  const weighted: { score: number; weight: number }[] = [];

  for (const s of scores) {
    const config = configs.find((c) => c.id === s.gaugeId);
    if (!config) continue; // not a real gauge — neither included nor "excluded" (nothing to disclose)
    if (s.levelScore === null) {
      excludedGaugeIds.push(s.gaugeId);
      continue;
    }
    includedGaugeIds.push(s.gaugeId);
    weighted.push({ score: s.levelScore, weight: config.weight });
  }

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  const composite =
    totalWeight > 0
      ? Math.round(
          (weighted.reduce((sum, w) => sum + w.score * w.weight, 0) / totalWeight) * 10
        ) / 10
      : null;

  return {
    composite,
    improving: scores.filter((s) => s.direction === "improving").length,
    deteriorating: scores.filter((s) => s.direction === "deteriorating").length,
    flat: scores.filter((s) => s.direction === "flat").length,
    includedGaugeIds,
    excludedGaugeIds,
  };
}

/**
 * Plain-English fragment naming every gauge excluded from the composite and
 * why, e.g. "Innovation excluded, no comparable peer data since 2021".
 * Returns null when nothing is excluded. Any caller with a non-null
 * excludedGaugeIds list MUST render whatever this returns somewhere the
 * reader will see the composite score — see assertCompositeDisclosure.
 */
export function buildCompositeDisclosure(
  excludedGaugeIds: string[],
  scores: GaugeScore[],
  configs: GaugeConfig[]
): string | null {
  if (excludedGaugeIds.length === 0) return null;

  const parts = excludedGaugeIds.map((id) => {
    const name = configs.find((c) => c.id === id)?.name ?? id;
    const score = scores.find((s) => s.gaugeId === id);
    const reason =
      score && score.latestYear > 0
        ? `no comparable peer data since ${score.latestYear}`
        : "no data yet";
    return `${name} excluded, ${reason}`;
  });

  return parts.join("; ");
}

/**
 * Closes the null-exclusion bug class, not just one instance of it: a gauge
 * silently dropped from the composite average — with no on-page disclosure
 * — is a worse failure than a page that refuses to build. Call this
 * wherever a composite is rendered, immediately after computing the
 * disclosure text that will actually appear on the page. Throws (which, in
 * a Server Component, fails `next build`) if any excluded gauge isn't
 * actually named in that text.
 */
export function assertCompositeDisclosure(
  result: CompositeResult,
  configs: GaugeConfig[],
  renderedDisclosureText: string | null
): void {
  if (result.excludedGaugeIds.length === 0) return;

  if (!renderedDisclosureText) {
    throw new Error(
      `Composite integrity violation: ${result.excludedGaugeIds.join(", ")} excluded from the ` +
        `composite but no disclosure text was rendered. Silent exclusion is never acceptable — ` +
        `see assertCompositeDisclosure in lib/scoring.ts.`
    );
  }

  for (const id of result.excludedGaugeIds) {
    const name = configs.find((c) => c.id === id)?.name ?? id;
    if (!renderedDisclosureText.includes(name)) {
      throw new Error(
        `Composite integrity violation: "${name}" is excluded from the composite but is not ` +
          `named in the disclosure text ("${renderedDisclosureText}"). Silent exclusion is never ` +
          `acceptable — see assertCompositeDisclosure in lib/scoring.ts.`
      );
    }
  }
}
