// Phase B: fetches every API-accessible gauge that's been wired up so far.
// Each gauge is isolated — one source failing does not stop the others from
// being attempted — but the run overall exits non-zero if any source
// failed, so this should never be mistaken for a clean run.
//
// Gauges not yet in GAUGE_IDS (later groups, plus the manual-source lane)
// aren't touched by this run — their existing data files are left as-is.
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createReport } from "./lib/report.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "..", "gauges.config.json");
const gaugesConfig = JSON.parse(readFileSync(configPath, "utf-8"));
const dataDir = join(__dirname, "..", "data", "processed");

// Add a gauge id here once its pipeline/gauges/<id>.mjs module exists.
// Group 1 (World Bank, single/dual indicators):
const GAUGE_IDS = [
  "living-standards",
  "innovation",
  "external-position",
  "rule-of-law-corruption",
  "demographic-momentum",
  // Group 2 (World Bank, share-of-world-total pattern):
  "trade",
  // Group 3 (IMF, hardest access layer):
  "economic-output",
  // Group 5 (BIS, bulk-style CSV, ISO2 country codes, quarterly->annual):
  "debt-burden",
  // Group 4 (OECD SDMX). Confirmed 2026-07: NOT a blanket Cloudflare block —
  // a GitHub Actions runner got real API responses (404/500) where this
  // project's own sandbox got a bot-protection challenge page. Access
  // behaviour is genuinely environment-dependent; see CLAUDE.md.
  "productivity",
  "housing-pressure",
  "human-capital-depth",
];

/** Reads a gauge's currently-saved provenance, if any, without touching it. */
function describeExistingData(gaugeId) {
  const path = join(dataDir, `${gaugeId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")).provenance ?? null;
  } catch {
    return null;
  }
}

function daysSince(isoDate) {
  return Math.round((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

/**
 * Builds the failure message body: what happened, whether this looks like
 * an environment-specific block (this run's environment vs. "somewhere
 * else"), and whether the site is silently missing data or quietly
 * retaining a stale-but-labelled previous fetch. Never implies "broken" for
 * a gauge that still has good (if aging) data sitting on the site.
 */
function describeFailure(err, config, gaugeId) {
  const runningInActions = process.env.GITHUB_ACTIONS === "true";
  const here = runningInActions ? "GitHub Actions" : "this local machine";
  const elsewhere = runningInActions ? "a local machine" : "GitHub Actions";

  const envNote =
    `Environment: this run is executing on ${here}. If this same gauge succeeds when run from ` +
    `${elsewhere}, the difference is this source's access behaviour on ${here}'s network specifically ` +
    `— not a broken series ID or a bug in this code.`;

  const existing = describeExistingData(gaugeId);
  let dataNote;
  if (existing?.status === "LIVE" && existing.retrievedAt) {
    const age = daysSince(existing.retrievedAt);
    dataNote =
      `Current site data: NOT missing or broken — retaining the last successful fetch from ` +
      `${existing.retrievedAt.slice(0, 10)} (${age} day${age === 1 ? "" : "s"} old). That date is shown ` +
      `on the site's source footer; it is never presented as more current than it is.`;
  } else if (existing?.status === "SAMPLE_DATA") {
    dataNote = "Current site data: still showing hand-written sample data, clearly marked as such.";
  } else {
    dataNote = "Current site data: no previous successful fetch exists — the gauge will show as awaiting data.";
  }

  return (
    `What happened: ${err.message}\n` +
    `${envNote}\n` +
    `${dataNote}\n` +
    `What to do next: Check the source (${config.source.url}) and the series ID in gauges.config.json, ` +
    `then re-run \`npm run pipeline\`. Or paste this report to Claude Code and ask it to fix it.`
  );
}

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
    report.failure(gaugeId, describeFailure(err, config, gaugeId));
  }
}

const clean = report.print();
process.exitCode = clean ? 0 : 1;
