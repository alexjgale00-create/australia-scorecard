import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

function readExistingFile(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function countObservations(countries) {
  if (!countries) return 0;
  return Object.values(countries).reduce((sum, c) => sum + (c?.series?.length ?? 0), 0);
}

/**
 * "AUS=1(2025-2025), CAN=0, ..." — per-country point count and year range,
 * so a truncation report answers "which countries/years actually survived"
 * directly, not just the aggregate total. Added 2026-08-09 after the guard's
 * first two live catches (both housing-pressure, both just "9 vs 288" with
 * no further detail) — the site owner's explicit ruling was that a bare
 * count turns every recurrence back into a fresh mystery; this is what
 * makes the *next* occurrence a diagnosis instead.
 */
function describeCountryBreakdown(countries) {
  return Object.entries(countries ?? {})
    .map(([code, c]) => {
      const n = c?.series?.length ?? 0;
      if (n === 0) return `${code}=0`;
      const years = c.series.map((p) => p.year);
      return `${code}=${n}(${Math.min(...years)}-${Math.max(...years)})`;
    })
    .join(", ");
}

/**
 * Persists the rejected response to a gitignored scratch file so the raw
 * evidence survives past this one run's console log — a truncation error's
 * text is a summary, this is the actual data it was computed from, for
 * whoever investigates next (possibly a different session with no memory of
 * this run's terminal output).
 */
function persistTruncatedEvidence(gaugeId, newCountries) {
  try {
    const dir = join(process.cwd(), "pipeline", ".scratch");
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = join(dir, `${gaugeId}-truncated-${stamp}.json`);
    writeFileSync(filePath, JSON.stringify(newCountries, null, 2) + "\n");
    return filePath;
  } catch (err) {
    // Never let the diagnostic-writing itself hide the real error — if this
    // fails, say so inline rather than throwing a different, more confusing
    // error in place of the truncation this was trying to explain.
    return `(could not write scratch evidence: ${err.message})`;
  }
}

/**
 * Guards against a source returning a badly truncated result silently
 * overwriting good historical data — a real incident (2026-08-08:
 * housing-pressure's OECD fetch returned 1 point where 35 existed, a
 * transient environment flake, caught only by inspecting the diff before
 * committing) that would otherwise have corrupted two dimensions at once,
 * since this gauge is now reused across both. This must never depend on
 * someone happening to read the diff — the pipeline itself refuses the
 * write.
 *
 * Compares TOTAL observations summed across every country, not just
 * Australia's — a fetch could return a full Australia series while
 * silently dropping every peer, which is just as much a truncation. Only
 * gates when the existing file is itself LIVE (sample data and first
 * landings have nothing meaningful to compare against) and only fires
 * below a hard floor, deliberately conservative: real data can legitimately
 * shrink a little (a source retracting one bad early estimate, say), just
 * never by half.
 */
const TRUNCATION_FLOOR = 0.5;

function assertNotTruncated(gaugeId, existing, newCountries) {
  if (!existing || existing.provenance?.status !== "LIVE") return;
  const priorCount = countObservations(existing.countries);
  const newCount = countObservations(newCountries);
  if (priorCount === 0) return;
  if (newCount >= priorCount * TRUNCATION_FLOOR) return;

  const dropPct = Math.round((1 - newCount / priorCount) * 100);
  const evidencePath = persistTruncatedEvidence(gaugeId, newCountries);
  throw new Error(
    `Refusing to write ${gaugeId}: this fetch returned ${newCount} total observation(s) across all ` +
      `countries, down from ${priorCount} in the current file — a ${dropPct}% drop, past this pipeline's ` +
      `${Math.round(TRUNCATION_FLOOR * 100)}% truncation floor. This looks like a bad or partial response, ` +
      `not real new data — the existing file has NOT been touched.\n` +
      `New response breakdown (country=points(yearRange)): ${describeCountryBreakdown(newCountries)}\n` +
      `Full rejected response saved to: ${evidencePath}\n` +
      `If this drop is genuinely correct (a source restating its history shorter), confirm by hand before ` +
      `re-running; never re-run blind hoping it clears on retry, and never raise this floor to make a ` +
      `specific failure go away without checking the actual data first.`
  );
}

/**
 * Tracks how a gauge's LIVE status was earned, so lib/maturity.ts can tell
 * "just landed" apart from "survived an unattended scheduled refresh" —
 * per the site owner's strict ruling, only GITHUB_EVENT_NAME === "schedule"
 * (the real monthly cron) counts toward Established. A workflow_dispatch
 * run or a local `npm run pipeline` proves the fetcher code works, not that
 * it keeps working unattended over real time — those still update the data
 * but never move scheduledRefreshCount. See CLAUDE.md's maturity honesty
 * rules.
 */
function computeMaturityFields(existing, newStatus) {
  if (newStatus !== "LIVE") {
    return {
      scheduledRefreshCount: existing?.scheduledRefreshCount ?? 0,
      lastScheduledRefreshAt: existing?.lastScheduledRefreshAt ?? null,
    };
  }

  const wasAlreadyLive = existing?.status === "LIVE";
  if (!wasAlreadyLive) {
    // First time this gauge has real data — a landing, not a refresh.
    return { scheduledRefreshCount: 0, lastScheduledRefreshAt: null };
  }

  const isScheduledRun = process.env.GITHUB_EVENT_NAME === "schedule";
  if (!isScheduledRun) {
    return {
      scheduledRefreshCount: existing.scheduledRefreshCount ?? 0,
      lastScheduledRefreshAt: existing.lastScheduledRefreshAt ?? null,
    };
  }

  return {
    scheduledRefreshCount: (existing.scheduledRefreshCount ?? 0) + 1,
    lastScheduledRefreshAt: new Date().toISOString(),
  };
}

export function writeGaugeData({ gaugeId, provenance, countries }) {
  const filePath = join(process.cwd(), "data", "processed", `${gaugeId}.json`);
  const existing = readExistingFile(filePath);
  assertNotTruncated(gaugeId, existing, countries);
  const maturityFields = computeMaturityFields(existing?.provenance ?? null, provenance.status);
  const payload = {
    gaugeId,
    provenance: { ...provenance, ...maturityFields },
    countries,
  };
  writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n");
  return filePath;
}
