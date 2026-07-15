import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

function readExistingProvenance(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")).provenance ?? null;
  } catch {
    return null;
  }
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
  const existing = readExistingProvenance(filePath);
  const maturityFields = computeMaturityFields(existing, provenance.status);
  const payload = {
    gaugeId,
    provenance: { ...provenance, ...maturityFields },
    countries,
  };
  writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n");
  return filePath;
}
