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
const warnings = [];

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
  } else if (peerCount === MIN_PEERS) {
    // Sitting exactly on the floor is not a failure, but it's one bad data
    // refresh away from becoming one — visible here so it's noticed before
    // it becomes a build failure, not after. See CLAUDE.md / METHODOLOGY.md
    // (Phase D) for work-life-balance specifically: this is a genuine
    // coverage question for that review, not something this script or a
    // rendering change can fix.
    warnings.push(`  - ${g.id}: exactly ${peerCount} peers — right on the floor, not below it (yet).`);
  }
}

if (failures.length > 0) {
  console.error("✖ verify-gauge-invariants: R3 peer-coverage floor violated\n" + failures.join("\n"));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("⚠ verify-gauge-invariants: peer coverage sitting exactly on the floor\n" + warnings.join("\n"));
}

console.log(`✓ verify-gauge-invariants: all scored gauges have ≥${MIN_PEERS} peers with a usable score`);

// ---------------------------------------------------------------------------
// Silent-gap guard, manual lane only (CLAUDE.md's "a gauge excluded from
// the composite for missing data must never be silent" rule, extended to
// the per-country S4 disclosure — see DESIGN.md's "S4 — Missing peer
// data"). An automated (accessType: "api") gauge's own fetcher already
// populates provenance.missingCountries itself when a country has no data
// (see pipeline/gauges/*.mjs) — nothing does that for the manual lane,
// since there's no fetcher to do it. Without this check, a country simply
// absent from a hand-entered CSV renders as a quietly smaller peer set,
// with no S4 box explaining why. Same discipline as the writtenAgainst
// guard: make the omission impossible to ship, don't rely on whoever
// converts the CSV remembering to declare it by hand.
//
// Scoped to accessType "manual" only, per the site owner's explicit
// ruling. Skips unscored (S7) gauges, same skip R3 uses above — an
// unscored gauge has no peer strip/rank machinery for a gap to be silent
// on in the first place (see UnscoredGaugeCard). Also skips scoringBasis
// "latest-wave-per-country" gauges: those don't compare on one shared
// year at all by design, so "missing at latestSharedYear" isn't a
// meaningful question — their real, deliberate per-country gaps are
// disclosed via each CountryScorePoint's own asOfYear instead. NOTE:
// cohesion-majority-acceptance — the one gauge documented (CLAUDE.md,
// METHODOLOGY.md) as using "latest-wave-per-country" — is only caught by
// the *unscored* skip above, not the scoringBasis one: gauges.config.json
// has no scoringBasis field set on it at all (confirmed by grep, 2026-08-
// 20), a real pre-existing discrepancy from what the docs describe. Not
// fixed here — flagged to the site owner. If this gauge is ever scored in
// a future phase, the scoringBasis skip below will need that field to
// actually be present in config or this check will misfire on it.
// ---------------------------------------------------------------------------
const silentGapFailures = [];

for (const g of config.gauges) {
  if (g.accessType !== "manual") continue;
  if (Object.keys(g.weights).length === 0) continue; // unscored (S7) — same skip R3 uses above, no peer strip to disclose a gap on
  if (g.scoringBasis === "latest-wave-per-country") continue;

  const file = path.join("data", "processed", `${g.id}.json`);
  if (!existsSync(file)) continue; // Awaiting Data — nothing to check yet

  const data = JSON.parse(readFileSync(file, "utf-8"));
  if (!data.countries?.AUS) continue;

  const year = latestSharedYear(data);
  if (!year) continue;

  const declaredMissing = new Set((data.provenance.missingCountries ?? []).map((m) => m.code));

  for (const peer of config.peerCountries) {
    if (peer.code === "AUS") continue;
    const hasDataAtYear = data.countries[peer.code]?.series.some((p) => p.year === year);
    if (!hasDataAtYear && !declaredMissing.has(peer.code)) {
      silentGapFailures.push(
        `  - ${g.id}: ${peer.name} (${peer.code}) has no data at latestSharedYear (${year}) and is ` +
          `not declared in provenance.missingCountries — absence must be declared, not silent. Add a ` +
          `missingCountries entry (code, name, reason) or find/enter real data for this country/year.`
      );
    }
  }
}

if (silentGapFailures.length > 0) {
  console.error(
    "✖ verify-gauge-invariants: silent gap on the manual lane — undeclared S4\n" + silentGapFailures.join("\n")
  );
  process.exit(1);
}

console.log(
  "✓ verify-gauge-invariants: every manual-gauge peer absence at latestSharedYear is declared in missingCountries"
);

// ---------------------------------------------------------------------------
// why-this-matters verification coverage — informational, never fails.
// A number, not a gate: see the site owner's ruling that this is legibility,
// not a completeness mandate. Regex-counted from the .ts source rather than
// imported, so this stays a plain node script with no TS compilation step —
// content/why-this-matters-verification.ts's own structure (one top-level
// "gauge-id": { entry per record) is regular enough for this to be reliable
// without a real parser.
// ---------------------------------------------------------------------------
const verificationSrc = readFileSync(
  path.join("content", "why-this-matters-verification.ts"),
  "utf-8"
);
const trackedGaugeIds = new Set(
  [...verificationSrc.matchAll(/^ {2}"([a-z0-9-]+)":\s*\{/gm)].map((m) => m[1])
);
const totalGauges = config.gauges.length;
console.log(
  `ℹ why-this-matters coverage: ${trackedGaugeIds.size} of ${totalGauges} gauges have a recorded ` +
    `writtenAgainst baseline (${[...trackedGaugeIds].sort().join(", ")})`
);
