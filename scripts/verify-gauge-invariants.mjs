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
// Automated-gauge staleness guard (2026-08-24). lib/maturity.ts's
// dataStaleness deliberately gives an accessType:"api" gauge NO computed
// STALE verdict unless staleAfterMonths has been explicitly, evidence-
// reviewed set for it — no silent fallback to the manual default, per the
// per-gauge cadence review recorded in CLAUDE.md. That's a real behaviour
// change to a gate every automated gauge's staleness display depends on,
// with no automated test in this repo to catch a regression (there is no
// test framework at all — see CLAUDE.md). This is the cheap, build-time
// substitute: every api gauge must EITHER carry a reviewed
// staleAfterMonths OR an explanatory staleDisclosure — silently having
// neither would mean a reader can never learn how current that gauge's
// data actually is, the exact failure the whole review exists to prevent.
// ---------------------------------------------------------------------------
const staleCoverageFailures = [];

for (const g of config.gauges) {
  if (g.accessType !== "api") continue;
  const hasThreshold = typeof g.staleAfterMonths === "number";
  const hasDisclosure = typeof g.staleDisclosure === "string" && g.staleDisclosure.length > 0;
  if (!hasThreshold && !hasDisclosure) {
    staleCoverageFailures.push(
      `  - ${g.id}: accessType "api" with no staleAfterMonths and no staleDisclosure — this gauge can ` +
        `never show a staleness verdict at all. Either set staleAfterMonths from a real, checked ` +
        `publication cadence, or add a staleDisclosure explaining why one can't be set (see innovation/ ` +
        `personal-safety for the pattern).`
    );
  }
}

if (staleCoverageFailures.length > 0) {
  console.error(
    "✖ verify-gauge-invariants: automated gauge with no staleness coverage at all\n" + staleCoverageFailures.join("\n")
  );
  process.exit(1);
}

console.log(
  "✓ verify-gauge-invariants: every automated gauge has either a reviewed staleAfterMonths or a staleDisclosure"
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

// ---------------------------------------------------------------------------
// REGISTER_DRAFT_LINES structured-facts guard (2026-08-26, HANDOVER.md entry
// 9). Three of this file's plain-language lines shipped wrong on the live
// site — hand-typed numbers that drifted from real data refreshes after the
// 2026-08-20 content review, wired to nothing that would notice.
// content/register-draft-line-facts.json now stores {ausValue, peerMedian,
// rank, of, displayDecimals} per gauge as data; content/register-draft-lines.ts
// generates the actual sentence from it at build time. This check recomputes
// the same four numbers live from data/processed/*.json and fails the build
// if any of them, rounded to that gauge's own declared displayDecimals
// (the precision its authored line was actually approved at — e.g.
// debt-burden's "165"/"162" are hand-rounded to whole numbers even though
// the live figures carry a decimal; see the JSON file's own field comment),
// no longer matches what's stored.
//
// Mirrors lib/scoring.ts's latestSharedYear (already mirrored above, for R3)
// and computeRank, plus lib/gauge-view.ts's median — a plain Node script,
// no TS import boundary, same reason pipeline/index.mjs hand-mirrors lib/
// logic (see CLAUDE.md's "pipeline mirrors lib/ deliberately" entry: name
// what's mirrored, treat a change to either side as incomplete until the
// other is checked).
//
// Deliberately covers ONLY the gauges listed in register-draft-line-facts.json
// (20 of 23, as of this writing) — see CLAUDE.md's "The status-line rule:
// what the REGISTER_DRAFT_LINES guard's output does and does not mean" entry
// for how that coverage must and must not be described (mechanically-checked
// claim-bearing strings, not "copy accuracy" generally — this guard covers a
// narrow slice, not the site's ~150 claim-bearing strings as a whole). Fails
// loud on any entry whose shape it doesn't recognise (a missing field, no
// matching gauge, no data file, no AUS series, no computable
// latestSharedYear) rather than silently skipping it — same discipline as
// assertWrittenAgainst.
// ---------------------------------------------------------------------------
const draftLineFacts = JSON.parse(
  readFileSync(path.join("content", "register-draft-line-facts.json"), "utf-8")
);
const REQUIRED_DRAFT_FACT_FIELDS = [
  "titlePhrase",
  "unitPhrase",
  "ausValue",
  "peerMedian",
  "rank",
  "of",
  "displayDecimals",
];
const draftLineFailures = [];

function computeRankMirror(data, polarity, code, year) {
  const values = Object.entries(data.countries)
    .map(([c, series]) => ({ code: c, value: series.series.find((p) => p.year === year)?.value }))
    .filter((v) => v.value !== undefined);
  if (values.length < 1) return null;
  const sorted = [...values].sort((a, b) =>
    polarity === "higher_is_better" ? b.value - a.value : a.value - b.value
  );
  const idx = sorted.findIndex((v) => v.code === code);
  if (idx === -1) return null;
  return { rank: idx + 1, of: sorted.length };
}

function medianMirror(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

for (const [id, facts] of Object.entries(draftLineFacts)) {
  const missingFields = REQUIRED_DRAFT_FACT_FIELDS.filter((f) => !(f in facts));
  if (missingFields.length > 0) {
    draftLineFailures.push(
      `  - ${id}: register-draft-line-facts.json entry is missing ${missingFields.join(", ")} — unrecognised shape, not silently skipped.`
    );
    continue;
  }

  const g = config.gauges.find((x) => x.id === id);
  if (!g) {
    draftLineFailures.push(`  - ${id}: no matching gauge in gauges.config.json — unrecognised shape.`);
    continue;
  }

  const file = path.join("data", "processed", `${id}.json`);
  if (!existsSync(file)) {
    draftLineFailures.push(
      `  - ${id}: has a drafted plain-language line but no data file at all — cannot verify a line describing data that doesn't exist.`
    );
    continue;
  }

  const data = JSON.parse(readFileSync(file, "utf-8"));
  if (!data.countries?.AUS) {
    draftLineFailures.push(`  - ${id}: data file has no AUS series — cannot verify.`);
    continue;
  }

  const year = latestSharedYear(data);
  if (year === null) {
    draftLineFailures.push(`  - ${id}: no latestSharedYear could be computed — cannot verify.`);
    continue;
  }

  const dp = facts.displayDecimals;
  const round = (v) => Math.round(v * 10 ** dp) / 10 ** dp;

  const liveAusValue = data.countries.AUS.series.find((p) => p.year === year)?.value;
  const livePeerValues = Object.entries(data.countries)
    .filter(([code]) => code !== "AUS")
    .map(([, s]) => s.series.find((p) => p.year === year)?.value)
    .filter((v) => v !== undefined && !Number.isNaN(v));
  const livePeerMedian = medianMirror(livePeerValues);
  const liveRankInfo = computeRankMirror(data, g.polarity, "AUS", year);

  const mismatches = [];
  if (liveAusValue === undefined || round(liveAusValue) !== round(facts.ausValue)) {
    mismatches.push(
      `AUS value stored=${facts.ausValue} live=${liveAusValue !== undefined ? round(liveAusValue) : "—"}`
    );
  }
  if (livePeerMedian === null || round(livePeerMedian) !== round(facts.peerMedian)) {
    mismatches.push(
      `peer median stored=${facts.peerMedian} live=${livePeerMedian !== null ? round(livePeerMedian) : "—"}`
    );
  }
  if (!liveRankInfo || liveRankInfo.rank !== facts.rank) {
    mismatches.push(`rank stored=${facts.rank} live=${liveRankInfo?.rank ?? "—"}`);
  }
  if (!liveRankInfo || liveRankInfo.of !== facts.of) {
    mismatches.push(`"of" stored=${facts.of} live=${liveRankInfo?.of ?? "—"}`);
  }

  if (mismatches.length > 0) {
    draftLineFailures.push(
      `  - ${id} (latestSharedYear=${year}): ${mismatches.join(" | ")} — content/register-draft-line-facts.json ` +
        `is stale. Update it (and re-review the generated sentence for anything beyond a number swap, per ` +
        `HANDOVER.md entry 9's work-life-balance case) before this ships again.`
    );
  }
}

if (draftLineFailures.length > 0) {
  console.error(
    "✖ verify-gauge-invariants: REGISTER_DRAFT_LINES facts no longer match live data\n" +
      draftLineFailures.join("\n")
  );
  process.exit(1);
}

console.log(
  `✓ verify-gauge-invariants: ${Object.keys(draftLineFacts).length} of ${Object.keys(draftLineFacts).length} ` +
    `known claim-bearing strings verified against live data (the drafted REGISTER_DRAFT_LINES entries only — ` +
    `not a copy-accuracy check of the site generally; see CLAUDE.md's status-line rule)`
);
