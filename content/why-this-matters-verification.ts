import type { EvidenceStrength, Polarity, ScoringBasis } from "@/lib/types";

/**
 * The audit trail for content/why-this-matters/*.md — see CLAUDE.md for
 * the incident that made this necessary: internal-cohesion.md described
 * v2x_cspart for a month after the gauge was switched to v2cacamps,
 * because nothing connected the config change to the prose. Two jobs,
 * kept in one file rather than two, since they're both "is this file
 * trustworthy" questions about the same content:
 *
 * 1. Claim-by-claim verification record (site owner's ruling). Every
 *    factual/evaluative assertion in a why-this-matters file, tagged
 *    verified / unverified / contested / cut — including CUT claims,
 *    with the bucket and reason, so nobody re-adds a removed superlative
 *    in six months having no idea it was already considered and rejected.
 * 2. writtenAgainst — the guard against the internal-cohesion class of
 *    bug. The subset of GaugeConfig this file's prose actually depends
 *    on, recorded at time of writing/review. lib/content.ts's
 *    getWhyThisMatters compares this against live config on every build
 *    and throws if they disagree — see assertWrittenAgainst there for
 *    the actual check and CLAUDE.md's Fix B for why a throw here can
 *    only ever fail the build, never reach a served page, under this
 *    project's static export.
 *
 * SCHEMA-INTEGRITY ONLY, NOT A COMPLETENESS MANDATE (site owner's
 * ruling): only gauges that have actually been audited get an entry
 * here. A gauge with no entry is simply unchecked — not flagged, not
 * blocked — same reasoning already applied to CAUSE content: forcing
 * every gauge to be entered before it can exist would recreate the
 * exact trap that made CAUSE (and now this) worth pausing on in the
 * first place.
 */

/**
 * The subset of GaugeConfig this file's prose is written to be
 * consistent with. Deliberately NOT every field on GaugeConfig — a tight,
 * justified baseline beats a wide one that fails on cosmetic config
 * edits. Included, and why:
 *   - seriesId, institution: which real series is being described.
 *     (The literal cause of the internal-cohesion incident.)
 *   - polarity: whether the prose's "better"/"worse" framing still
 *     matches config — a flipped polarity leaves the prose arguing the
 *     wrong direction with nothing else to catch it.
 *   - unit: the prose routinely explains what the number means (a share,
 *     a rate, an interval-scale index) — a unit change can silently
 *     invalidate that explanation the same way a series change can.
 *   - scoringBasis, evidenceStrength (optional, only when non-default):
 *     several files explicitly discuss how a gauge is compared
 *     (same-year vs latest-wave) or what kind of evidence it is
 *     (hard-statistic vs self-reported survey) — both are real prose
 *     content, not just internal scoring mechanics, so a change here can
 *     orphan a claim the same way. Normalised against the same default
 *     fallback lib/scoring.ts and lib/maturity.ts already use
 *     ("same-year" / "hard-statistic"), so omitting the field in config
 *     is not itself a mismatch.
 *
 * Deliberately EXCLUDED, and why:
 *   - polarityJustification, dataPolicy: these are themselves prose,
 *     reviewed the same way why-this-matters is — a change to either is
 *     visible in the same commit's diff a reviewer is already reading,
 *     unlike a compact categorical field's silent drift. Exact-string
 *     comparison against long prose would also fail on harmless wording
 *     fixes, which is exactly the "fails spuriously" outcome to avoid.
 *   - weights, unscoredDimensions, accessType, historyStartYear,
 *     maturityOverride, staleAfterMonths: real config, but about how a
 *     gauge is scored/scheduled/composited, not what it conceptually
 *     measures — not what why-this-matters prose is about.
 *   - plates, axisTreatment, bandRobustness, valueScale: REGISTER
 *     presentation-layer fields, not measurement — out of scope by
 *     construction, same reasoning as the previous group.
 */
export interface WrittenAgainst {
  seriesId: string;
  institution: string;
  polarity: Polarity;
  unit: string;
  scoringBasis?: ScoringBasis;
  evidenceStrength?: EvidenceStrength;
}

export type ClaimStatus = "verified" | "unverified" | "contested" | "cut";

export interface WhyThisMattersClaim {
  /** The exact clause, quoted from the file, so it's traceable back to the source text. */
  claim: string;
  status: ClaimStatus;
  /** Required when status is "verified": what would/does settle it. */
  source?: string;
  /** Required when status is "verified": ISO date checked. */
  checkedAt?: string;
  /** For "cut": which triage bucket it was (B/C/D) and why. For "contested": what's disputed. */
  note?: string;
}

export interface WhyThisMattersRecord {
  writtenAgainst: WrittenAgainst;
  claims: WhyThisMattersClaim[];
}

export const WHY_THIS_MATTERS_RECORDS: Record<string, WhyThisMattersRecord> = {
  "internal-cohesion": {
    writtenAgainst: {
      seriesId: "v2cacamps",
      institution: "V-Dem Institute (via Our World in Data)",
      polarity: "lower_is_better",
      unit: "V-Dem political polarization score (interval scale, mean-centered at 0 across all country-years — not a 0-1 share)",
    },
    claims: [
      {
        claim: "This gauge tracks political polarization: V-Dem's own definition is the extent to which a society is divided into hostile political camps that discourage interaction and cooperation across ideological lines.",
        status: "verified",
        source: "V-Dem codebook definition of v2cacamps, already verified and quoted in CLAUDE.md during the 2026-07-16 methodology switch",
        checkedAt: "2026-08-20",
        note: "Rewrite replacing the file's previous description of v2x_cspart (civil society participation), the variable this gauge used before the switch — the file was never updated when the switch happened. See CLAUDE.md for the full incident.",
      },
    ],
  },
};
