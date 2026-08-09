import { existsSync, readFileSync } from "fs";
import { join } from "path";
import gaugesConfigRaw from "@/gauges.config.json";
import type { DimensionId, GaugeData, GaugesConfigFile } from "@/lib/types";

export const gaugesConfig = gaugesConfigRaw as unknown as GaugesConfigFile;

export function getGaugeConfig(id: string) {
  return gaugesConfig.gauges.find((g) => g.id === id) ?? null;
}

/**
 * A gauge's `weights` object is the single source of truth for dimension
 * membership (see GaugeConfig in lib/types.ts) — this is the one place that
 * reads it, so every page asks the same question the same way rather than
 * re-deriving it. A gauge reused across dimensions (currently only
 * housing-pressure) appears in both lists.
 */
export function getGaugesForDimension(dimensionId: DimensionId) {
  return gaugesConfig.gauges.filter((g) => g.weights[dimensionId] !== undefined);
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
