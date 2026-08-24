import type { GaugeConfig, GaugeData } from "@/lib/types";

/**
 * The site's honesty layer for data quality, distinct from the score bands
 * (which grade Australia's performance). This grades the gauge itself: is
 * the number behind it real, current, and proven to keep refreshing on its
 * own? See CLAUDE.md's "Data maturity — honesty rules" for the governing
 * principles this file implements.
 */
export type MaturityTier = "established" | "live" | "provisional" | "awaiting-data";

export interface MaturityInfo {
  tier: MaturityTier;
  /**
   * Non-null only when the tier isn't simply "real automated data that
   * hasn't yet survived a scheduled refresh" — a disclosed gap, a hand-set
   * override, or an auto-demotion all carry a reason so /status never shows
   * a tier without saying why.
   */
  reason: string | null;
}

export const MATURITY_TIER_LABELS: Record<MaturityTier, string> = {
  established: "Established",
  live: "Live",
  provisional: "Provisional",
  "awaiting-data": "Awaiting data",
};

/**
 * One plain-English sentence per tier for the gauge detail page: what the
 * tier means and what would promote it. Established is deliberately the
 * unmarked default elsewhere on the site, but still gets a sentence here
 * for a reader who lands directly on a gauge's detail page.
 */
export function describeMaturityTier(tier: MaturityTier, gaugeName: string): string {
  switch (tier) {
    case "established":
      return `${gaugeName} uses real, automated data that has survived at least one unattended scheduled refresh — this is the site's highest confidence tier.`;
    case "live":
      return `${gaugeName} uses real, sourced data with settled methodology, but hasn't yet earned Established — see "What's next" on the Data status page for exactly what would promote it.`;
    case "provisional":
      return `${gaugeName} uses real data, but a methodology element specific to this gauge is still open — see "What's next" on the Data status page for what's unresolved.`;
    case "awaiting-data":
      return `${gaugeName} is configured but has no real data yet — see the Data status page for what's blocking its first entry.`;
  }
}

/** Gauges refreshed by the automated pipeline are auto-demoted from Established if this many months pass with no successful scheduled refresh. */
const API_DEMOTE_AFTER_MONTHS = 3;
const DEFAULT_MANUAL_STALE_AFTER_MONTHS = 15;

function monthsSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (30.44 * 86_400_000);
}

/**
 * The latest year Australia's own series actually has a data point for —
 * "data through [this year]," the fact a reader needs to judge currency,
 * independent of when the file holding it was last written or
 * re-downloaded. Same `.at(-1)` "series is stored sorted ascending"
 * convention buildGaugeView already relies on elsewhere.
 */
export function latestDataYear(data: GaugeData | null): number | null {
  return data?.countries.AUS?.series.at(-1)?.year ?? null;
}

export function computeMaturity(config: GaugeConfig, data: GaugeData | null): MaturityInfo {
  if (!data || data.provenance.status !== "LIVE") {
    return { tier: "awaiting-data", reason: null };
  }

  // Manual-lane gauges have no unattended refresh loop to survive — capped
  // at Live even with settled methodology and a full, current entry.
  if (config.accessType === "manual") {
    return { tier: "live", reason: null };
  }

  if (config.maturityOverride) {
    return { tier: config.maturityOverride.tier, reason: config.maturityOverride.reason };
  }

  const missing = data.provenance.missingCountries ?? [];
  if (missing.length > 0) {
    const names = missing.map((m) => m.name).join(", ");
    return {
      tier: "live",
      reason: `Disclosed gap: no data for ${names}. See provenance below for why.`,
    };
  }

  const scheduledRefreshCount = data.provenance.scheduledRefreshCount ?? 0;
  if (scheduledRefreshCount < 1) {
    return { tier: "live", reason: null };
  }

  const lastScheduledRefreshAt = data.provenance.lastScheduledRefreshAt;
  if (lastScheduledRefreshAt && monthsSince(lastScheduledRefreshAt) > API_DEMOTE_AFTER_MONTHS) {
    return {
      tier: "live",
      reason: `No successful scheduled refresh in over ${API_DEMOTE_AFTER_MONTHS} months — demoted from Established until the automated pipeline recovers.`,
    };
  }

  return { tier: "established", reason: null };
}

const TIER_ORDER: MaturityTier[] = ["established", "live", "provisional", "awaiting-data"];
const TIER_SENTENCE_NOUN: Record<MaturityTier, string> = {
  established: "established",
  live: "live",
  provisional: "provisional",
  "awaiting-data": "awaiting first data",
};

export function computeMaturityCounts(
  gauges: GaugeConfig[],
  getData: (id: string) => GaugeData | null
): Record<MaturityTier, number> {
  const counts: Record<MaturityTier, number> = {
    established: 0,
    live: 0,
    provisional: 0,
    "awaiting-data": 0,
  };
  for (const config of gauges) {
    const { tier } = computeMaturity(config, getData(config.id));
    counts[tier]++;
  }
  return counts;
}

/**
 * "An evolving scorecard: 6 measures established, 5 live, 5 awaiting first
 * data." Degrades gracefully — a tier at zero (including Established) is
 * simply omitted, never rendered as "0 established". Shared by the
 * homepage banner and /status so the two can never disagree.
 */
export function summarizeMaturityCounts(counts: Record<MaturityTier, number>): string {
  const present = TIER_ORDER.filter((tier) => counts[tier] > 0);
  if (present.length === 0) return "An evolving scorecard.";
  const clauses = present.map((tier, i) => {
    const n = counts[tier];
    const label = i === 0 ? `measure${n === 1 ? "" : "s"} ${TIER_SENTENCE_NOUN[tier]}` : TIER_SENTENCE_NOUN[tier];
    return `${n} ${label}`;
  });
  return `An evolving scorecard: ${clauses.join(", ")}.`;
}

/**
 * For a manual-lane gauge that already has real data: is it due for a
 * refresh on its own cadence? Mirrors pipeline/index.mjs's manualStale
 * check exactly, so /status and the monthly pipeline report never
 * disagree. Not a tier demotion — old-but-real data doesn't become less
 * real for being overdue; it's a separate "due for a refresh" disclosure.
 *
 * **Computed from the latest OBSERVATION year, not from when the file was
 * pulled.** Ruled 2026-08-24, after inequality shipped with real data
 * ending 2020 but a `retrievedAt`/`sourcePulledAt` of the ingestion day —
 * the old pull-date basis would have shown it as freshly current on the
 * strength of re-downloading (and re-confirming) an old number, which is
 * exactly backwards: a gauge whose real data ends 2020 is just as stale
 * in 2026 no matter how recently someone re-pulled that same 2020 figure.
 * `sourcePulledAt`/`retrievedAt` remain meaningful — they answer "when did
 * we last check this source," shown separately as the Retrieved date —
 * but neither feeds this calculation any more.
 *
 * **Extended to automated (`accessType: "api"`) gauges the same day**, once
 * every one of them got a real, source-specific `staleAfterMonths` from a
 * per-gauge publication-cadence review (see CLAUDE.md) — deliberately NOT
 * a blanket default: an `api` gauge only gets a verdict when
 * `staleAfterMonths` has been explicitly, evidence-reviewed set for it.
 * Two sources (`innovation`, `personal-safety`) were reviewed and left
 * without a number on purpose — no authoritative publication cadence could
 * be confirmed for either, and falling back to the manual default would
 * misrepresent a structurally slow, healthy source as an overdue fetch.
 * Those two rely solely on `config.staleDisclosure` (always shown — see
 * `describeWhatsNext` below and `components/Gauge.tsx`) rather than a
 * computed flag.
 */
export function dataStaleness(
  config: GaugeConfig,
  data: GaugeData | null
): { stale: boolean; ageDescription: string } | null {
  if (!data || data.provenance.status !== "LIVE") return null;
  if (config.accessType !== "manual" && config.staleAfterMonths === undefined) return null;

  const year = latestDataYear(data);
  if (year === null) return null;

  const staleAfterMonths = config.staleAfterMonths ?? DEFAULT_MANUAL_STALE_AFTER_MONTHS;
  // Treated as of December 31 of the latest observation year — the
  // earliest point at which "data through [year]" could possibly be
  // called stale.
  const ageMonths = monthsSince(`${year}-12-31`);
  const roundedMonths = Math.round(ageMonths);
  const ageDescription = `data through ${year} (~${roundedMonths} month${roundedMonths === 1 ? "" : "s"} old)`;

  return { stale: ageMonths > staleAfterMonths, ageDescription };
}

/** The pipeline's cron is "0 3 1 * *" (03:00 UTC, 1st of every month) — see .github/workflows/pipeline.yml. */
export function nextScheduledRunDescription(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 3, 0, 0));
  return next.toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/**
 * A gauge's `staleDisclosure` prose may embed `{{DATA_AGE_YEARS}}` and/or
 * `{{DATA_THROUGH_YEAR}}` tokens instead of writing a specific age or year
 * directly — the age is a fact about the gauge's own data, not a fact about
 * the prose describing it, and a literal number written into config goes
 * wrong the moment a calendar year passes with nobody touching this file
 * (found 2026-08-25: cohesion-majority-acceptance's disclosure said
 * "genuinely 7 years old" as a static string, the same hardcoding the
 * methodology page's card copy had just been fixed to compute instead —
 * two strings stating the same fact with two different expiry dates).
 * Substituted from `latestDataYear` here, at render time, wherever
 * `staleDisclosure` is actually shown — not baked into the config value
 * itself. Plain strings with no tokens pass through unchanged, so this is
 * safe to call on every gauge's disclosure, not just ones that use it.
 */
export function resolveStaleDisclosure(config: GaugeConfig, data: GaugeData | null): string | undefined {
  const disclosure = config.staleDisclosure;
  if (!disclosure || !disclosure.includes("{{")) return disclosure;

  const year = latestDataYear(data);
  const ageYears = year !== null ? String(new Date().getFullYear() - year) : "several";
  const throughYear = year !== null ? String(year) : "an earlier year";

  return disclosure
    .replaceAll("{{DATA_AGE_YEARS}}", ageYears)
    .replaceAll("{{DATA_THROUGH_YEAR}}", throughYear);
}

/** The /status page's "What's next" column — one plain-English line per gauge. */
export function describeWhatsNext(
  config: GaugeConfig,
  data: GaugeData | null,
  maturity: MaturityInfo
): string {
  if (maturity.tier === "established") return "—";

  if (maturity.tier === "awaiting-data") {
    return config.accessType === "manual"
      ? "Waiting on a manual download — see data/manual/README.md."
      : "Waiting on the pipeline's first successful fetch.";
  }

  if (maturity.reason) return maturity.reason;

  // A gauge can carry a custom staleDisclosure when the generic "due for a
  // refresh" framing would misrepresent its real state — e.g. cohesion-
  // majority-acceptance, whose age isn't a missed routine re-download but
  // the practical end of what's publicly available at all; or innovation
  // and personal-safety, whose sources are structurally slow and already
  // returning their freshest available number. Checked before the computed
  // verdict, and shown unconditionally when present — innovation/
  // personal-safety have no computed staleAfterMonths at all (see
  // dataStaleness above), so this is the only place their caveat surfaces.
  if (config.staleDisclosure) return resolveStaleDisclosure(config, data)!;

  const staleness = dataStaleness(config, data);
  if (staleness?.stale) {
    return `Due for a refresh — ${staleness.ageDescription}.`;
  }

  if (config.accessType === "manual") {
    return "Real data, settled methodology — manual-lane gauges top out at Live, since there's no unattended refresh loop to survive.";
  }

  return `Needs 1 successful unattended scheduled refresh to reach Established — next scheduled run: ${nextScheduledRunDescription()}.`;
}
