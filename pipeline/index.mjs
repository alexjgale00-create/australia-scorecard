// Phase B, Group 1: fetches every API-accessible gauge that's been wired up
// so far. Each gauge is isolated — one source failing does not stop the
// others from being attempted — but the run overall exits non-zero if any
// source failed, so this should never be mistaken for a clean run.
//
// Gauges not yet in GAUGE_IDS (Groups 2-5, plus the manual-source lane)
// aren't touched by this run — their existing data files are left as-is.
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createReport } from "./lib/report.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "..", "gauges.config.json");
const gaugesConfig = JSON.parse(readFileSync(configPath, "utf-8"));

// Phase B, Group 1. Add a gauge id here once its pipeline/gauges/<id>.mjs
// module exists — Groups 2-5 will extend this list, not replace it.
const GAUGE_IDS = [
  "living-standards",
  "innovation",
  "external-position",
  "rule-of-law-corruption",
  "demographic-momentum",
];

const report = createReport();

for (const gaugeId of GAUGE_IDS) {
  const config = gaugesConfig.gauges.find((g) => g.id === gaugeId);
  if (!config) {
    report.failure(gaugeId, "No entry for this gauge in gauges.config.json — skipping.");
    continue;
  }

  try {
    const gaugeModule = await import(`./gauges/${gaugeId}.mjs`);
    await gaugeModule.run(config, report);
  } catch (err) {
    report.failure(
      gaugeId,
      `What happened: ${err.message}\n` +
        `What I did: Nothing was written or changed for "${config.name}". The site keeps showing ` +
        `its existing data (sample or previously fetched), clearly marked, rather than a broken or ` +
        `guessed number.\n` +
        `What to do next: Check the source (${config.source.url}) and the series ID in ` +
        `gauges.config.json, then re-run \`npm run pipeline\`. Or paste this report to Claude Code ` +
        `and ask it to fix it.`
    );
  }
}

const clean = report.print();
process.exitCode = clean ? 0 : 1;
