import gaugesConfigRaw from "@/gauges.config.json";
import livingStandards from "@/data/processed/living-standards.json";
import productivity from "@/data/processed/productivity.json";
import education from "@/data/processed/education.json";
import type { GaugeData, GaugesConfigFile } from "@/lib/types";

export const gaugesConfig = gaugesConfigRaw as unknown as GaugesConfigFile;

const dataRegistry: Record<string, GaugeData> = {
  "living-standards": livingStandards as GaugeData,
  productivity: productivity as GaugeData,
  education: education as GaugeData,
};

export function getGaugeConfig(id: string) {
  return gaugesConfig.gauges.find((g) => g.id === id) ?? null;
}

export function getGaugeData(id: string): GaugeData | null {
  return dataRegistry[id] ?? null;
}

export function getAllGaugeIds(): string[] {
  return gaugesConfig.gauges.map((g) => g.id);
}
