import type {
  CompositeResult,
  CountryCode,
  CountryScorePoint,
  Direction,
  DimensionId,
  GaugeConfig,
  GaugeData,
  GaugeScore,
  LevelScoreDelta,
  PeerRelativeTrend,
  Polarity,
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

/**
 * The min-max normalise → flip for polarity → round-to-one-decimal
 * arithmetic behind every level score on the site — the one computation
 * computeLevelScore and computeLevelScoreLatestWavePerCountry both need,
 * after each assembles its own set of comparable values a different way
 * (one shared year vs. each country's own latest wave). Found duplicated
 * byte-for-byte between the two, 2026-08-31, by a wider grep run after the
 * scoringBasis-specific one had already come back clean — see HANDOVER.md
 * entry 15 for why a grep on the config field itself would never have
 * caught this: neither function repeats a comparison on `polarity`, they
 * repeat what they *do* with it.
 */
function normalizeScore(targetValue: number, allValues: number[], polarity: Polarity): number {
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  if (max === min) return 50;
  const raw = (targetValue - min) / (max - min);
  const normalized = polarity === "higher_is_better" ? raw : 1 - raw;
  return Math.round(normalized * 1000) / 10;
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

  return normalizeScore(
    target.value,
    values.map((v) => v.value),
    config.polarity
  );
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
 * The "latest-wave-per-country" counterpart to computeLevelScore: instead
 * of comparing every country's value from one shared year, each country
 * contributes its own most recent available value, whatever year that
 * happens to be. Deliberate, disclosed departure from the site's usual
 * same-year rule — see ScoringBasis in lib/types.ts and
 * describeScoringBasis below. Used only when config.scoringBasis is
 * "latest-wave-per-country" (currently: cohesion-majority-acceptance).
 */
export function computeLevelScoreLatestWavePerCountry(
  data: GaugeData,
  config: GaugeConfig,
  code: CountryCode
): number | null {
  const values = Object.entries(data.countries)
    .map(([c, series]) => {
      if (series.series.length === 0) return null;
      const latest = series.series.reduce((a, b) => (b.year > a.year ? b : a));
      return { code: c as CountryCode, value: latest.value, year: latest.year };
    })
    .filter((v): v is { code: CountryCode; value: number; year: number } => v !== null);

  if (values.length < 2) return null;
  const target = values.find((v) => v.code === code);
  if (!target) return null;

  return normalizeScore(
    target.value,
    values.map((v) => v.value),
    config.polarity
  );
}

/** latest-wave-per-country counterpart to computeLevelScoreForAllCountries — each point carries its own asOfYear, since they genuinely differ. */
export function computeLevelScoreForAllCountriesLatestWave(
  data: GaugeData,
  config: GaugeConfig
): CountryScorePoint[] {
  return Object.entries(data.countries)
    .map((entry): CountryScorePoint | null => {
      const [code, country] = entry;
      if (country.series.length === 0) return null;
      const latest = country.series.reduce((a, b) => (b.year > a.year ? b : a));
      const score = computeLevelScoreLatestWavePerCountry(data, config, code as CountryCode);
      return score === null ? null : { code: code as CountryCode, name: country.name, score, asOfYear: latest.year };
    })
    .filter((p): p is CountryScorePoint => p !== null);
}

/**
 * The one place `config.scoringBasis` is compared against its
 * "latest-wave-per-country" literal. Every other site that needs to know
 * which basis a gauge uses calls this instead of repeating the string
 * comparison — consolidated 2026-08-31 after the identical comparison
 * turned up in three independent places (this file, twice, plus
 * lib/gauge-view.ts), two of which were only found because a live gauge
 * finally exercised the disagreement between them (a wrong 68.4 headline
 * composite, caught before it shipped — see HANDOVER.md entries 12/13/15).
 * If a third basis is ever added, this is the only place that needs to
 * learn about it structurally (every dispatch below already routes
 * through here, not through its own copy of the check).
 */
export function usesLatestWaveBasis(config: GaugeConfig): boolean {
  return config.scoringBasis === "latest-wave-per-country";
}

/**
 * The one computation of "every country's level score, on whichever basis
 * this gauge actually uses" — the real branch on scoringBasis for the
 * level-score fact, made exactly once. `computeCompositeForAllCountries`
 * and `buildGaugeView` (lib/gauge-view.ts) both call this rather than
 * re-deciding the basis themselves; `computeLevelScoreRespectingBasis`
 * below (a single-country lookup) is defined in terms of this one, not as
 * a second computation of the same fact.
 */
export function computeLevelScoreForAllCountriesRespectingBasis(
  data: GaugeData,
  config: GaugeConfig
): CountryScorePoint[] {
  if (usesLatestWaveBasis(config)) {
    return computeLevelScoreForAllCountriesLatestWave(data, config);
  }
  const year = latestSharedYear(data);
  return year ? computeLevelScoreForAllCountries(data, config, year) : [];
}

/**
 * The single-country counterpart to computeLevelScoreForAllCountriesRespectingBasis
 * above — a lookup into that one computation, not an independent
 * re-implementation of the basis dispatch. `computeCompositeForAllCountries`
 * calls this per (country, gauge) pair; `computeGaugeScore`'s own dispatch
 * (below) still branches once at its own top, since the latest-wave path
 * there returns a structurally different bundle (level score AND direction
 * AND rank together, via computeGaugeScoreLatestWave) that this function
 * was never meant to produce — see that function's own comment for why
 * direction/rank can't be unified across bases the way level score can.
 */
export function computeLevelScoreRespectingBasis(
  data: GaugeData,
  config: GaugeConfig,
  code: CountryCode
): number | null {
  return computeLevelScoreForAllCountriesRespectingBasis(data, config).find((p) => p.code === code)?.score ?? null;
}

/** latest-wave-per-country counterpart to computeRank. */
export function computeRankLatestWavePerCountry(
  data: GaugeData,
  config: GaugeConfig,
  code: CountryCode
): { rank: number; of: number } | null {
  const values = Object.entries(data.countries)
    .map(([c, series]) => {
      if (series.series.length === 0) return null;
      const latest = series.series.reduce((a, b) => (b.year > a.year ? b : a));
      return { code: c as CountryCode, value: latest.value };
    })
    .filter((v): v is { code: CountryCode; value: number } => v !== null);

  if (values.length < 1) return null;
  const sorted = [...values].sort((a, b) =>
    config.polarity === "higher_is_better" ? b.value - a.value : a.value - b.value
  );
  const idx = sorted.findIndex((v) => v.code === code);
  if (idx === -1) return null;
  return { rank: idx + 1, of: sorted.length };
}

/**
 * How few waves is too few to trust a computed trend from. Two points ~3
 * years apart (e.g. Gallup MAI's 2016/17 and 2019 waves) can't distinguish
 * a real trend from noise between two snapshots — this gate exists
 * specifically so the site never manufactures a confident-looking arrow out
 * of that. Only applied on the "latest-wave-per-country" basis — every
 * same-year gauge keeps its existing null-based "no trend data" handling
 * untouched, since this is a new, narrower honesty rule, not a general
 * tightening of the site's existing direction logic.
 */
const MIN_WAVES_FOR_TREND = 3;
const MIN_SPAN_YEARS_FOR_TREND = 6;

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

/**
 * Only gauges carrying a weight for `dimensionId` in their config
 * contribute — a gauge outside this dimension is simply not part of its
 * math, same "not included, nothing to disclose" treatment as an unknown
 * gauge id in computeComposite below. A reused gauge (weighted in more than
 * one dimension) naturally participates in each dimension's composite
 * independently, using that dimension's own weight.
 *
 * A gauge whose `provenance.status` is `SAMPLE_DATA` is excluded the same
 * way a gauge with no data file at all is excluded elsewhere (it's never
 * even in `gaugesData` in that case) — placeholder data doesn't get to
 * contribute a synthetic number to a real composite. The gauge's own page
 * still renders the sample data with its badge; this only stops it feeding
 * the headline. See CLAUDE.md / HANDOVER.md, "productivity" blocker.
 */
export function computeCompositeForAllCountries(
  gaugesData: { data: GaugeData; config: GaugeConfig }[],
  dimensionId: DimensionId
): CountryScorePoint[] {
  const inDimension = gaugesData.filter(
    ({ config, data }) => config.weights[dimensionId] !== undefined && data.provenance.status !== "SAMPLE_DATA"
  );

  // Computed once per gauge, not once per (country, gauge) pair, and no
  // longer this function's own branch on scoringBasis — see
  // computeLevelScoreForAllCountriesRespectingBasis, the one place that
  // decision is made now. Until 2026-08-27 this function scored every
  // gauge same-year unconditionally (no branch at all), invisible only
  // because no live gauge had used the latest-wave basis since it was
  // built (2026-08-11). The moment one did, this function and
  // computeGaugeScore disagreed about the same gauge: the gauge page
  // showed Australia at 80.9 on the latest-wave basis while this function
  // fed 72.4 into the composite, computed against whichever three
  // countries happened to share Australia's own fieldwork year — a wrong
  // 68.4 headline composite, caught before it shipped. See CLAUDE.md and
  // HANDOVER.md entries 12/15.
  const scoresByGauge = new Map(
    inDimension.map(({ data, config }) => [
      config.id,
      computeLevelScoreForAllCountriesRespectingBasis(data, config),
    ])
  );

  const allCodes = new Set<CountryCode>();
  for (const { data } of inDimension) {
    for (const code of Object.keys(data.countries)) allCodes.add(code as CountryCode);
  }

  const points: CountryScorePoint[] = [];
  for (const code of allCodes) {
    let name: string | null = null;
    const weighted: { score: number; weight: number }[] = [];
    for (const { data, config } of inDimension) {
      const country = data.countries[code];
      if (!country) continue;
      name = country.name;
      const score = scoresByGauge.get(config.id)!.find((p) => p.code === code)?.score ?? null;
      if (score !== null) weighted.push({ score, weight: config.weights[dimensionId]! });
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

/**
 * The "latest-wave-per-country" counterpart to the main computeGaugeScore
 * path below. Direction here is deliberately conservative: with fewer than
 * MIN_WAVES_FOR_TREND waves or less than MIN_SPAN_YEARS_FOR_TREND years
 * between the earliest and latest, it reports "insufficient-history"
 * rather than guessing at a trend from too little data. No gauge currently
 * has enough waves to exercise a real trend computation on this basis
 * (cohesion-majority-acceptance has 2) — that path is intentionally not
 * built yet rather than guessed at; build it for real once a gauge actually
 * has 3+ waves spanning 6+ years to compute from.
 */
function computeGaugeScoreLatestWave(
  data: GaugeData,
  config: GaugeConfig,
  code: CountryCode
): GaugeScore {
  const levelScore = computeLevelScoreLatestWavePerCountry(data, config, code);
  const rankInfo = computeRankLatestWavePerCountry(data, config, code);

  const countryPoints = data.countries[code]?.series ?? [];
  const years = countryPoints.map((p) => p.year);
  const latestYear = years.length > 0 ? Math.max(...years) : 0;
  const span = years.length > 0 ? Math.max(...years) - Math.min(...years) : 0;

  let direction: Direction | null = null;
  if (levelScore !== null) {
    if (countryPoints.length < MIN_WAVES_FOR_TREND || span < MIN_SPAN_YEARS_FOR_TREND) {
      direction = "insufficient-history";
    } else {
      // Deliberate scaffolding with a known trigger date — not a bug, and
      // not an oversight. See HANDOVER.md §3.
      //
      // A real trend computation on this basis has never been built,
      // because no gauge has ever had enough waves to compute one from.
      // This branch used to return `direction: null`, which renders as
      // "no trend data" — meaning the gauge would silently claim it had
      // no trend at the exact moment it finally acquired one, with
      // nothing anywhere announcing the change. That is the same failure
      // shape as HANDOVER entries 12 and 13: an unexercised path that
      // degrades quietly instead of loudly.
      //
      // It has a delivery date. WVS Wave 8's fieldwork closes December
      // 2026, and the upgrade triggers on cohesion-majority-acceptance
      // exist specifically to add a second wave to it; a third follows.
      // So this throws instead, failing `next build` while someone is
      // looking at it rather than shipping a wrong answer nobody checks.
      throw new Error(
        `Trend computation on the latest-wave-per-country basis is not built, and "${config.id}" ` +
          `now needs it: ${code} has ${countryPoints.length} waves spanning ${span} years ` +
          `(${Math.min(...years)}–${Math.max(...years)}), which clears both gates ` +
          `(MIN_WAVES_FOR_TREND=${MIN_WAVES_FOR_TREND}, MIN_SPAN_YEARS_FOR_TREND=${MIN_SPAN_YEARS_FOR_TREND}).\n\n` +
          `This is a planned boundary, not a defect you have found. Build the real computation in ` +
          `computeGaugeScoreLatestWave (lib/scoring.ts): a peer-relative trend across waves whose ` +
          `spacing differs by country, which is why it was deferred rather than copied from ` +
          `computePeerRelativeTrend — that function assumes an annual, evenly-spaced series and ` +
          `cannot simply be reused here.\n\n` +
          `Do not silence this by widening the gates or restoring "insufficient-history": the gauge ` +
          `would then assert it has too little history to trust while holding enough to compute from. ` +
          `See METHODOLOGY.md's "Alternate scoring basis" and HANDOVER.md §3.`
      );
    }
  }

  return {
    gaugeId: config.id,
    latestYear,
    levelScore,
    direction,
    australiaRank: rankInfo?.rank ?? null,
    peerCount: rankInfo?.of ?? 0,
  };
}

export function computeGaugeScore(
  data: GaugeData,
  config: GaugeConfig,
  thresholdScorePointsPerYear: number,
  code: CountryCode = "AUS"
): GaugeScore {
  if (usesLatestWaveBasis(config)) {
    return computeGaugeScoreLatestWave(data, config, code);
  }

  const year = latestSharedYear(data);
  const levelScore = year ? computeLevelScore(data, config, code, year) : null;
  const direction = year
    ? (computePeerRelativeTrend(data, config, code, year, thresholdScorePointsPerYear)?.direction ?? null)
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

/**
 * One plain-English sentence naming a gauge's scoring basis when it isn't
 * the site's default — so the "same-year vs latest-wave-per-country" fork
 * is visible on the gauge page, /status, and Methodology without anyone
 * having to read lib/scoring.ts to know which gauges use which. Returns
 * null for the default "same-year" basis (the unmarked common case).
 */
export function describeScoringBasis(config: GaugeConfig): string | null {
  if (config.scoringBasis !== "latest-wave-per-country") return null;
  return (
    `${config.shortName} is scored differently from every other gauge on this site: instead of ` +
    `comparing all 9 countries' values from the same year, each country's own most recent available ` +
    `value is used, even though that year differs from country to country. This gauge's underlying ` +
    `source publishes irregular, non-synchronized survey waves per country, so requiring a shared year ` +
    `would exclude most of the peer set. See "Alternate scoring basis" in METHODOLOGY.md.`
  );
}

/**
 * A year is a coverage cliff, not ordinary noise, once more than this
 * fraction of that year's already-launched gauges (see `gaugeStartYear`
 * below) are missing from the blend. Not a round number picked for
 * convenience — a real, empirically-found gap in the missing-data
 * distribution separates the two on both dimensions independently:
 * checked live 2026-08-24 against every year 1990-2025, every "ordinary"
 * year (an OECD series' uneven per-country lag, GBD's non-annual release
 * cadence, etc.) tops out at 18.75% missing on Power and 16.7% on Quality
 * of Life; every year that turned out to be a real coverage-cliff artifact
 * (Power's 2023-2025, QoL's 2024-2025) starts at 25% and climbs to 42.9%.
 * 20% sits cleanly in that gap on both dimensions. See CLAUDE.md's
 * "Trajectory series fix" entry for the full check and the specific years
 * this excludes on each dimension as of this ruling.
 */
const COVERAGE_CLIFF_THRESHOLD = 0.2;

/**
 * Composite trajectory series, coverage-cliff-guarded. Feeds ONLY the
 * homepage's "TRAILING DECADE — COMPOSITE TRAJECTORY" sparkline
 * (`DimensionVerdict.tsx`) — confirmed by tracing every consumer before
 * this guard was added: no direction verdict, no WHAT'S MOVING riser/
 * faller, and no per-gauge trend anywhere on the site reads this
 * function's output. Those are all computed from each individual gauge's
 * OWN `latestSharedYear` (`computeGaugeScore`, `computeLevelScoreDelta`),
 * never from this AUS-anchored, multi-gauge-blended series, so they were
 * never at risk from the defect this guard fixes.
 *
 * **The defect, and the fix.** Forcing every gauge in a dimension onto one
 * shared, AUS-anchored calendar year works fine while gauge coverage is
 * even — but a year where several gauges simply haven't published yet
 * (not a real historical event, just recency) used to produce a real,
 * plotted point anyway: any year with at least one reporting gauge was
 * included, with no coverage floor at all. Found 2026-08-24 when Quality
 * of Life's 2025 point (4 of 7 gauges) read 51.4 against a live composite
 * of 67.9 — a 16.5-point gap that would have visibly disagreed with the
 * headline verdict on the same page. Ruled: exclude such years from the
 * computation itself (Approach B — see METHODOLOGY.md), not just flag
 * them cosmetically in the UI, since nothing downstream needs the
 * unrepresentative value and a hidden-but-still-computed number is exactly
 * the kind of silent artifact this project has repeatedly guarded against
 * elsewhere (the truncation guard, the composite-exclusion disclosure).
 * A gauge's "already launched" year comes from its own real AUS data
 * (`gaugeStartYear`, the earliest point actually on file), not the
 * declared `historyStartYear` target in config, which can legitimately
 * differ from what was actually ingested.
 */
export function computeHistoricalComposite(
  gaugesData: { data: GaugeData; config: GaugeConfig }[],
  dimensionId: DimensionId
): { points: { year: number; composite: number }[]; excludedYears: number[] } {
  // A latest-wave-per-country gauge is structurally excluded from the
  // historical series, not merely absent from most years of it. This
  // function builds a same-year time series: for each year it scores every
  // country against that year's peer values. A gauge on the latest-wave
  // basis has, by definition, no shared year — each country's single
  // observation sits in a different one. Including such a gauge would put a
  // score in the series that is not the gauge's real score (Australia's
  // 2018 point would be computed against only the peers that also happen to
  // have 2018 fieldwork) and would make the gauge count as "eligible" from
  // its first year onward, inflating the coverage-cliff fraction for every
  // later year against a gauge that can never fill it.
  //
  // The visible consequence, stated rather than hidden: the trajectory
  // chart and the median-annual-move derived from it cover the same-year
  // gauges only, so they can differ from the headline composite, which
  // includes every scored gauge. That divergence is real and is the honest
  // reading — a gauge with one wave per country genuinely has no history to
  // plot. Added 2026-08-27, when the first latest-wave gauge went live.
  const inDimension = gaugesData.filter(
    ({ config }) =>
      config.weights[dimensionId] !== undefined && config.scoringBasis !== "latest-wave-per-country"
  );

  // 1980-1989 excluded outright, separate from (and in addition to) the
  // coverage-cliff guard below — a pre-existing, already-documented
  // convention (METHODOLOGY.md's Phase D analysis: "only 2-4 gauges have
  // data that far back — noisy, not representative") that every offline
  // calibration script this project has run always applied, but that this
  // function itself never actually implemented until now. Found
  // 2026-08-24 while building the proximity disclosure: Power's true
  // 1980 point is New Zealand at 3.1, built from just 2 gauges (the only
  // two with data that far back) — passes the coverage-cliff guard below
  // cleanly (0% of *eligible* gauges missing, since only 2 have started)
  // while still being exactly the thin, unrepresentative extreme that
  // guard exists to catch. The coverage-cliff guard is relative to
  // already-launched gauges and was never meant to catch "very few gauges
  // have launched at all yet" — this fixed 1990 floor is. Confirmed this
  // doesn't change any already-ruled band threshold (every calibration
  // script already excluded 1980-1989 by hand); it only brings the live
  // trajectory chart and this function's other consumers in line with
  // the data those thresholds were actually derived from.
  const allYears = inDimension
    .flatMap(({ data }) => data.countries.AUS?.series.map((p) => p.year) ?? [])
    .filter((y, i, arr) => arr.indexOf(y) === i)
    .filter((y) => y >= 1990)
    .sort((a, b) => a - b);

  const gaugeStartYear = new Map(
    inDimension.map(({ config, data }) => {
      const years = data.countries.AUS?.series.map((p) => p.year) ?? [];
      return [config.id, years.length > 0 ? Math.min(...years) : Infinity];
    })
  );

  const points: { year: number; composite: number }[] = [];
  const excludedYears: number[] = [];
  for (const year of allYears) {
    const weighted = inDimension
      .map(({ data, config }) => {
        const score = computeLevelScore(data, config, "AUS", year);
        return score === null ? null : { score, weight: config.weights[dimensionId]! };
      })
      .filter((w): w is { score: number; weight: number } => w !== null);

    if (weighted.length === 0) continue;

    const eligibleCount = inDimension.filter(
      ({ config }) => (gaugeStartYear.get(config.id) ?? Infinity) <= year
    ).length;
    const missingFraction = eligibleCount > 0 ? (eligibleCount - weighted.length) / eligibleCount : 0;
    if (missingFraction > COVERAGE_CLIFF_THRESHOLD) {
      excludedYears.push(year);
      continue;
    }

    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    const composite =
      Math.round(
        (weighted.reduce((sum, w) => sum + w.score * w.weight, 0) / totalWeight) * 10
      ) / 10;
    points.push({ year, composite });
  }
  return { points, excludedYears };
}

/**
 * Scoped to one dimension: `scores` may cover gauges from both dimensions
 * (the homepage computes the full scores array once and calls this twice),
 * but only gauges weighted in `dimensionId` are included or excluded here —
 * a gauge outside this dimension is simply not this composite's business,
 * same as an unrecognised gauge id.
 */
export function computeComposite(
  scores: GaugeScore[],
  configs: GaugeConfig[],
  dimensionId: DimensionId
): CompositeResult {
  const includedGaugeIds: string[] = [];
  const excludedGaugeIds: string[] = [];
  const weighted: { score: number; weight: number }[] = [];

  for (const s of scores) {
    const config = configs.find((c) => c.id === s.gaugeId);
    if (!config) continue; // not a real gauge — neither included nor "excluded" (nothing to disclose)
    const weight = config.weights[dimensionId];
    if (weight === undefined) continue; // not part of this dimension at all
    if (s.levelScore === null) {
      excludedGaugeIds.push(s.gaugeId);
      continue;
    }
    includedGaugeIds.push(s.gaugeId);
    weighted.push({ score: s.levelScore, weight });
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
    // Scoped to gauges that actually fed the average, so the four terms
    // always sum to includedGaugeIds.length — a gauge dropped for a null
    // level score is disclosed by buildCompositeDisclosure, not counted here.
    noTrend: includedGaugeIds.filter((id) => {
      const found = scores.find((s) => s.gaugeId === id);
      return !found || found.direction === null || found.direction === "insufficient-history";
    }).length,
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

/**
 * The median absolute year-over-year change across a composite series —
 * this dimension's own instrument resolution, in points per typical year.
 * Always computed from the data (the same coverage-cliff-guarded series
 * `computeHistoricalComposite` already produces), never hardcoded — a
 * dimension whose gauges change lands differently than one whose gauges
 * are volatile, and the two dimensions are not expected to share one
 * number. See `computeBoundaryProximity` below, the only current
 * consumer.
 */
export function medianAbsoluteAnnualMove(points: { year: number; composite: number }[]): number | null {
  const diffs: number[] = [];
  for (let i = 1; i < points.length; i++) diffs.push(Math.abs(points[i].composite - points[i - 1].composite));
  if (diffs.length === 0) return null;
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

export interface ProximityGroup {
  /** The real decision boundary a band change happens at — each band's own `min` (not a cosmetic chart gridline), matching what `bandForScore` actually compares against. */
  boundary: number;
  lowerBandLabel: string;
  upperBandLabel: string;
  countries: { code: CountryCode; name: string; score: number }[];
}

/**
 * Which countries currently sit close enough to a band boundary that this
 * dimension's own instrument can't cleanly tell them apart from whatever
 * is on the other side — "close" meaning within one typical year's
 * movement (`medianAnnualMove`, always computed from the data, see
 * above), never a fixed number. This is a statement about resolution, not
 * about volatility: a country here isn't "at risk of changing," the
 * composite simply doesn't discriminate at this margin. Ruled 2026-08-24
 * after the first draft's copy ("a small change could shift the verdict")
 * was found to imply the wrong claim.
 *
 * Countries are grouped by boundary, not reported individually — two or
 * more countries straddling the *same* boundary is a real property of the
 * peer distribution (confirmed on Quality of Life: 4 of 9 countries
 * cluster around the Strengthening/Leading line), and reporting it as one
 * finding about the pack is both more accurate and shorter than repeating
 * near-identical sentences per country. Membership is computed fresh from
 * `countryScores` every time — nothing here is a hardcoded country list.
 */
export function computeBoundaryProximity(
  countryScores: CountryScorePoint[],
  scoreBands: ScoreBand[],
  medianAnnualMove: number
): ProximityGroup[] {
  const sorted = [...scoreBands].sort((a, b) => a.min - b.min);
  // The real decision boundaries are each band's own min (score >= min &&
  // score < nextBand.min, per bandForScore) — not AnchoredSparkline's
  // cosmetic max+0.5 gridline, which exists for chart legibility only.
  const boundaries = sorted.slice(1).map((b) => b.min);

  const groups = new Map<number, ProximityGroup>();
  for (const cs of countryScores) {
    let nearestBoundary = boundaries[0];
    let nearestDist = Math.abs(cs.score - boundaries[0]);
    for (const b of boundaries) {
      const d = Math.abs(cs.score - b);
      if (d < nearestDist) {
        nearestDist = d;
        nearestBoundary = b;
      }
    }
    if (nearestDist > medianAnnualMove) continue;

    if (!groups.has(nearestBoundary)) {
      const idx = boundaries.indexOf(nearestBoundary);
      groups.set(nearestBoundary, {
        boundary: nearestBoundary,
        lowerBandLabel: sorted[idx].label,
        upperBandLabel: sorted[idx + 1].label,
        countries: [],
      });
    }
    groups.get(nearestBoundary)!.countries.push({ code: cs.code, name: cs.name, score: cs.score });
  }

  return [...groups.values()].sort((a, b) => a.boundary - b.boundary);
}

/**
 * The far side of a boundary from wherever a country currently sits — the
 * band it can't be cleanly separated from, which is what the single-
 * country proximity sentence actually names (never the country's own
 * current band, which would be a different, useless claim to make).
 */
function farBandLabel(group: ProximityGroup, score: number): string {
  return score < group.boundary ? group.upperBandLabel : group.lowerBandLabel;
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The full-length proximity sentence — used for Australia's own note
 * (solo or clustered) and for a peer cluster of 2+ shown beneath it. Never
 * used for a lone peer, which gets the shorter `proximityCompact` instead.
 */
export function proximitySentence(group: ProximityGroup): string {
  if (group.countries.length === 1) {
    const c = group.countries[0];
    return (
      `${c.name}’s reading sits within a typical year’s movement of the ` +
      `${farBandLabel(group, c.score)} boundary — close enough that the composite does not ` +
      `cleanly separate it from countries on the other side.`
    );
  }
  const names = joinNames(group.countries.map((c) => c.name));
  return (
    `${names} all sit within a typical year’s movement of the ${group.lowerBandLabel}/` +
    `${group.upperBandLabel} boundary — on this measure the composite does not meaningfully ` +
    `separate them.`
  );
}

/** The short form for a single peer, listed beneath Australia's own note. */
export function proximityCompact(group: ProximityGroup): string {
  const c = group.countries[0];
  return `${c.name}: too close to the ${farBandLabel(group, c.score)} boundary to separate cleanly.`;
}
