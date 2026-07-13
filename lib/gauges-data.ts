import { existsSync, readFileSync } from "fs";
import { join } from "path";
import gaugesConfigRaw from "@/gauges.config.json";
import type { GaugeData, GaugesConfigFile } from "@/lib/types";

export const gaugesConfig = gaugesConfigRaw as unknown as GaugesConfigFile;

export function getGaugeConfig(id: string) {
  return gaugesConfig.gauges.find((g) => g.id === id) ?? null;
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
