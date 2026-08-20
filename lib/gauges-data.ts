import { existsSync, readFileSync } from "fs";
import { join } from "path";
import gaugesConfigRaw from "@/gauges.config.json";
import type { DimensionId, GaugeConfig, GaugeData, GaugesConfigFile } from "@/lib/types";

export const gaugesConfig = gaugesConfigRaw as unknown as GaugesConfigFile;

export function getGaugeConfig(id: string) {
  return gaugesConfig.gauges.find((g) => g.id === id) ?? null;
}

/**
 * A gauge appears on a dimension either scored (a key in `weights`) or
 * unscored (a dimension listed in `unscoredDimensions`, real data shown but
 * never fed into that dimension's composite) — this is the one place that
 * asks either question, so every page agrees. A gauge reused across
 * dimensions (currently only housing-pressure) appears in both lists.
 */
export function getGaugesForDimension(dimensionId: DimensionId) {
  return gaugesConfig.gauges.filter(
    (g) => g.weights[dimensionId] !== undefined || g.unscoredDimensions?.includes(dimensionId)
  );
}

/** Whether this gauge's score actually counts toward `dimensionId`'s composite — see `unscoredDimensions` in lib/types.ts. */
export function isScoredInDimension(config: GaugeConfig, dimensionId: DimensionId): boolean {
  return config.weights[dimensionId] !== undefined;
}

/**
 * Reads from disk (not a static import) so a gauge can be configured in
 * gauges.config.json before its data file exists — e.g. right after adding
 * a new API-accessible gauge but before `npm run pipeline` has been run.
 * Returns null in that case; callers show an "awaiting data" state rather
 * than crashing the build.
 */
export function getGaugeData(id: string): GaugeData | null {
  const path = join(process.cwd(), "data", "processed", `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as GaugeData;
}

export function getAllGaugeIds(): string[] {
  return gaugesConfig.gauges.map((g) => g.id);
}

/**
 * Every real plate on the site — one gauge, one plate, always (see the
 * housing-pressure fix in CLAUDE.md/DESIGN.md's R8 note). Powers
 * /table/[plate]'s generateStaticParams; a gauge weighted or listed in two
 * dimensions still contributes exactly one entry here, since `plates` only
 * ever has one key.
 */
export function getAllPlates(): { plate: string; gaugeId: string; dimensionId: DimensionId }[] {
  return gaugesConfig.gauges.flatMap((g) =>
    (Object.entries(g.plates) as [DimensionId, string][]).map(([dimensionId, plate]) => ({
      plate,
      gaugeId: g.id,
      dimensionId,
    }))
  );
}

/** Resolves a plate string (route param) back to its one gauge + dimension, or null if no gauge claims it. */
export function resolvePlate(plate: string): { config: GaugeConfig; dimensionId: DimensionId } | null {
  for (const g of gaugesConfig.gauges) {
    for (const [dimensionId, p] of Object.entries(g.plates) as [DimensionId, string][]) {
      if (p === plate) return { config: g, dimensionId };
    }
  }
  return null;
}

/** Every gauge with its data (null if not yet fetched) — the shape computeCompositeForAllCountries and friends expect. */
export function getAllGaugesWithData(): { config: GaugeConfig; data: GaugeData | null }[] {
  return gaugesConfig.gauges.map((config) => ({ config, data: getGaugeData(config.id) }));
}
