#!/usr/bin/env node
/**
 * Build-level invariants that a TypeScript type alone can't enforce,
 * checked against real data before every build (wired into "prebuild" in
 * package.json, alongside sync-public-data.mjs). Exits non-zero — and so
 * fails `next build` — on any violation. Mirrors the peer-coverage check
 * built into lib/gauge-view.ts's assertMinimumPeerCoverage (which runs
 * again, per-gauge, whenever a page actually calls buildGaugeView) — this
 * script is the fast, whole-fleet check that runs unconditionally on every
 * build regardless of which routes exist yet.
 *
 * R3 (DESIGN.md): "Australia is never shown alone." A gauge with fewer
 * than MIN_PEERS peers carrying a usable score after missingCountries
 * exclusion can't honestly support a rank, a median, or a "position among
 * peers" strip — see CLAUDE.md/DESIGN.md for the full reasoning.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const MIN_PEERS = 3;

const config = JSON.parse(readFileSync("gauges.config.json", "utf-8"));

function latestSharedYear(data) {
  const ausYears = (data.countries.AUS?.series ?? []).map((p) => p.year).sort((a, b) => b - a);
  for (const year of ausYears) {
    const n = Object.values(data.countries).filter((c) => c.series.some((p) => p.year === year)).length;
    if (n >= 2) return year;
  }
  return ausYears[0] ?? null;
}

const failures = [];

for (const g of config.gauges) {
  const isScored = Object.keys(g.weights).length > 0;
  if (!isScored) continue; // unscored gauges (S7) never claim peer context in this sense

  const file = path.join("data", "processed", `${g.id}.json`);
  if (!existsSync(file)) continue; // Awaiting Data — nothing to check yet

  const data = JSON.parse(readFileSync(file, "utf-8"));
  if (!data.countries?.AUS) continue;

  let peerCount;
  if (g.scoringBasis === "latest-wave-per-country") {
    peerCount = Object.entries(data.countries).filter(
      ([code, s]) => code !== "AUS" && s.series.length > 0
    ).length;
  } else {
    const year = latestSharedYear(data);
    if (!year) continue;
    peerCount = Object.entries(data.countries).filter(
      ([code, s]) => code !== "AUS" && s.series.some((p) => p.year === year)
    ).length;
  }

  if (peerCount < MIN_PEERS) {
    failures.push(
      `  - ${g.id}: only ${peerCount} peer(s) with a usable score — needs ${MIN_PEERS}. ` +
        `Move it to an S4 (missing peer data) or S7 (unscored) treatment, don't render it as a normal scored gauge.`
    );
  }
}

if (failures.length > 0) {
  console.error("✖ verify-gauge-invariants: R3 peer-coverage floor violated\n" + failures.join("\n"));
  process.exit(1);
}

console.log(`✓ verify-gauge-invariants: all scored gauges have ≥${MIN_PEERS} peers with a usable score`);
