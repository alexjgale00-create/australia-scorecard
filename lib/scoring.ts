import type {
  CountryCode,
  Direction,
  GaugeConfig,
  GaugeData,
  GaugeScore,
} from "@/lib/types";

/**
 * All scoring here is Phase A / early Phase D: a level score (min-max
 * position within the peer set on the latest shared year) and a direction
 * classification (trailing ~10y annualised change vs a fixed threshold).
 * The composite verdict is a straight weighted average of level scores.
 * See METHODOLOGY.md for the full write-up and the threshold's justification.
 */

export function latestSharedYear(data: GaugeData): number | null {
  const years = Object.values(data.countries)
    .flatMap((c) => c.series.map((p) => p.year))
    .filter((y, i, arr) => arr.indexOf(y) === i)
    .sort((a, b) => b - a);
  return years[0] ?? null;
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

export function classifyDirection(
  data: GaugeData,
  code: CountryCode,
  latestYear: number,
  thresholdPctPerYear: number
): Direction | null {
  const country = data.countries[code];
  if (!country) return null;

  const targetStartYear = latestYear - 10;
  const candidates = country.series.filter((p) => p.year <= targetStartYear);
  const startPoint =
    candidates.length > 0
      ? candidates.reduce((a, b) => (b.year > a.year ? b : a))
      : country.series.reduce((a, b) => (a.year < b.year ? a : b));
  const endPoint = country.series.find((p) => p.year === latestYear);
  if (!endPoint || startPoint.year === endPoint.year || startPoint.value === 0) {
    return "flat";
  }

  const years = endPoint.year - startPoint.year;
  const totalPctChange = (endPoint.value - startPoint.value) / Math.abs(startPoint.value);
  const annualizedPct = (totalPctChange / years) * 100;

  if (annualizedPct > thresholdPctPerYear) return "improving";
  if (annualizedPct < -thresholdPctPerYear) return "deteriorating";
  return "flat";
}

export function computeGaugeScore(
  data: GaugeData,
  config: GaugeConfig,
  thresholdPctPerYear: number,
  code: CountryCode = "AUS"
): GaugeScore {
  const year = latestSharedYear(data);
  const levelScore = year ? computeLevelScore(data, config, code, year) : null;
  const direction = year
    ? classifyDirection(data, code, year, thresholdPctPerYear)
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

export function computeComposite(
  scores: GaugeScore[],
  configs: GaugeConfig[]
): {
  composite: number | null;
  improving: number;
  deteriorating: number;
  flat: number;
} {
  const weighted = scores
    .map((s) => {
      const config = configs.find((c) => c.id === s.gaugeId);
      if (!config || s.levelScore === null) return null;
      return { score: s.levelScore, weight: config.weight };
    })
    .filter((w): w is { score: number; weight: number } => w !== null);

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
  };
}
