import { readFileSync } from "fs";
import { join } from "path";
import siteContent from "@/content/site.json";
import { WHY_THIS_MATTERS_RECORDS, type WrittenAgainst } from "@/content/why-this-matters-verification";
import { getGaugeConfig } from "@/lib/gauges-data";
import type { GaugeConfig } from "@/lib/types";

export function getSiteContent() {
  return siteContent;
}

/**
 * The internal-cohesion guard (see content/why-this-matters-verification.ts
 * for the full incident and the field-by-field reasoning behind this exact
 * shape). Only runs for gauges that actually have a recorded baseline —
 * schema-integrity, not a completeness mandate. Throws inside a Server
 * Component's render (this function is called from every gauge detail
 * page), which fails `next build` outright under this project's static
 * export — there is no request-time render for a throw to reach instead,
 * verified live the same way Fix B was (see CLAUDE.md).
 */
function assertWrittenAgainst(gaugeId: string, config: GaugeConfig, recorded: WrittenAgainst): void {
  const effectiveScoringBasis = config.scoringBasis ?? "same-year";
  const recordedScoringBasis = recorded.scoringBasis ?? "same-year";
  const effectiveEvidenceStrength = config.evidenceStrength ?? "hard-statistic";
  const recordedEvidenceStrength = recorded.evidenceStrength ?? "hard-statistic";

  const checks: { field: string; recorded: string; live: string }[] = [
    { field: "source.seriesId", recorded: recorded.seriesId, live: config.source.seriesId },
    { field: "source.institution", recorded: recorded.institution, live: config.source.institution },
    { field: "polarity", recorded: recorded.polarity, live: config.polarity },
    { field: "unit", recorded: recorded.unit, live: config.unit },
    { field: "scoringBasis", recorded: recordedScoringBasis, live: effectiveScoringBasis },
    { field: "evidenceStrength", recorded: recordedEvidenceStrength, live: effectiveEvidenceStrength },
  ];

  for (const { field, recorded: recordedValue, live } of checks) {
    if (recordedValue !== live) {
      throw new Error(
        `content/why-this-matters/${gaugeId}.md's recorded baseline (content/why-this-matters-verification.ts) ` +
          `is stale: "${field}" was "${recordedValue}" when this file was last reviewed, but gauges.config.json ` +
          `now has "${field}" = "${live}". This gauge's explanatory copy may now describe the wrong thing — this ` +
          `is exactly how internal-cohesion.md broke for a month in 2026-07/08 (see CLAUDE.md). ` +
          `Fix: (1) update content/why-this-matters/${gaugeId}.md to match the new "${field}", ` +
          `then (2) update writtenAgainst.${field} in content/why-this-matters-verification.ts to "${live}". ` +
          `Do both in the same commit as the config change, not after.`
      );
    }
  }
}

export function getWhyThisMatters(gaugeId: string): string {
  const path = join(process.cwd(), "content", "why-this-matters", `${gaugeId}.md`);
  let text: string;
  try {
    text = readFileSync(path, "utf-8").trim();
  } catch {
    return "[No 'why this matters' copy has been written yet for this gauge.]";
  }

  const record = WHY_THIS_MATTERS_RECORDS[gaugeId];
  if (record) {
    const config = getGaugeConfig(gaugeId);
    if (config) assertWrittenAgainst(gaugeId, config, record.writtenAgainst);
  }

  return text;
}
