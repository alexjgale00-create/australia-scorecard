import { existsSync, readFileSync, writeFileSync } from "fs";
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
  throw new Error(
    `Refusing to write ${gaugeId}: this fetch returned ${newCount} total observation(s) across all ` +
      `countries, down from ${priorCount} in the current file — a ${dropPct}% drop, past this pipeline's ` +
      `${Math.round(TRUNCATION_FLOOR * 100)}% truncation floor. This looks like a bad or partial response, ` +
      `not real new data — the existing file has NOT been touched. If this drop is genuinely correct (a ` +
      `source restating its history shorter), confirm by hand before re-running; never re-run blind hoping ` +
      `it clears on retry, and never raise this floor to make a specific failure go away without checking ` +
      `the actual data first.`
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
