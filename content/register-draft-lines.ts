import { getGaugeConfig } from "@/lib/gauges-data";
import rawDraftLineFacts from "./register-draft-line-facts.json";

/**
 * Draft plain-language lines — REGISTER's Tier 1 "plain-language line"
 * slot (see DESIGN.md). Generated, not written: each sentence states only
 * Australia's own value, the peer median, and Australia's rank — pure
 * arithmetic, no causal or evaluative language, per the site owner's
 * explicit condition for what's safe to auto-draft.
 *
 * Reviewed and approved by the site owner, 2026-08-20 — see HANDOVER.md's
 * merge-readiness section for the review record. Wording (title phrase,
 * unit phrase, sentence structure) has not changed since that review.
 *
 * **Restructured 2026-08-26** (HANDOVER.md entry 9): three of these lines
 * were found wrong on the live site — hand-typed numbers that had
 * silently drifted from real data refreshes after the 2026-08-20 review,
 * wired to nothing that would notice. The numbers now live in
 * `register-draft-line-facts.json` as data, not prose, and
 * `scripts/verify-gauge-invariants.mjs` recomputes {AUS value, peer
 * median, rank, of} live from `data/processed/*.json` (mirroring
 * `lib/scoring.ts`'s `latestSharedYear`/`computeRank` and this file's own
 * `median`, same discipline CLAUDE.md's "pipeline mirrors lib/" entry
 * documents for the pipeline's own mirrors) and fails the build if any
 * entry's stored number, rounded to its own declared `displayDecimals`,
 * no longer matches. Only the numbers and the polarity suffix are
 * derived — the title phrase and unit phrase stay authored text,
 * unchanged, exactly as approved.
 */
export interface DraftLineFacts {
  /** Exactly as approved 2026-08-20 — "Australia's {titlePhrase} is ...". Never derived; changing it is a wording change, out of scope for this restructure. */
  titlePhrase: string;
  /** Exactly as approved 2026-08-20 — the parenthetical after the value. Deliberately NOT derived from GaugeConfig.unit, which is sometimes worded differently (e.g. economic-complexity's config unit is "Economic Complexity Index (ECI)"; this gauge's approved sentence says "(Economic Complexity Index)") — deriving it would be an uninstructed wording change. */
  unitPhrase: string;
  ausValue: number;
  peerMedian: number;
  rank: number;
  of: number;
  /** How many decimal places this gauge's authored numbers are rounded to — e.g. debt-burden's "165"/"162" are hand-rounded to whole numbers even though the live figures carry a decimal. Verified against every gauge's actually-approved precision, not assumed uniform; see the build guard for how this is used to distinguish real drift from authored rounding. */
  displayDecimals: 0 | 1 | 2;
}

export const REGISTER_DRAFT_LINE_FACTS: Record<string, DraftLineFacts> = rawDraftLineFacts as Record<
  string,
  DraftLineFacts
>;

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * The one non-numeric fact still derived rather than stored: the "(lower
 * is better on this gauge)" suffix is a mechanical function of
 * GaugeConfig.polarity, never independently authored — verified against
 * all 20 gauges before this restructure (every "lower_is_better" gauge
 * carried the suffix, every "higher_is_better" gauge didn't, with zero
 * exceptions), so storing it a second time here would just be a second
 * copy of a fact gauges.config.json already owns.
 */
function renderDraftLine(id: string, facts: DraftLineFacts): string {
  const config = getGaugeConfig(id);
  if (!config) {
    throw new Error(
      `register-draft-line-facts.json has an entry for "${id}" but gauges.config.json has no such gauge — ` +
        `unrecognised shape, not silently skipped.`
    );
  }
  const suffix = config.polarity === "lower_is_better" ? " (lower is better on this gauge)" : "";
  return (
    `Australia's ${facts.titlePhrase} is ${facts.ausValue} (${facts.unitPhrase}); ` +
    `the peer median is ${facts.peerMedian}. Australia ranks ${ordinal(facts.rank)} of ${facts.of}${suffix}.`
  );
}

export const REGISTER_DRAFT_LINES: Record<string, string> = Object.fromEntries(
  Object.entries(REGISTER_DRAFT_LINE_FACTS).map(([id, facts]) => [id, renderDraftLine(id, facts)])
);

/**
 * Draft CAUSE copy — five Tier 1 gauges, live. Identified in the authoring
 * inventory (see CLAUDE.md) as naming a real, specific driver in existing
 * repo content, rather than being purely definitional. Per the site
 * owner's rule: transcription with citation, not invention — every claim
 * below was checked live (WebSearch, this session) against a real source
 * before being written here, not carried over unverified from the
 * `why-this-matters` drafts (which are themselves marked "[DRAFT — edit
 * freely]" and were never held to a citation bar — see the site owner's
 * why-this-matters audit in CLAUDE.md for how unverified that content
 * turned out to be).
 *
 * Reviewed and approved by the site owner, 2026-08-20 — same as the
 * plain-language lines.
 *
 * A sixth candidate, economic-complexity, was drafted and then HELD OUT
 * by explicit site owner ruling — see the commented-out entry below for
 * why. Not deleted: restorable once §3.2 settles the question it raises.
 */
export const REGISTER_DRAFT_CAUSES: Record<string, string> = {
  "innovation":
    "The Australian Government's Strategic Examination of R&D (‘Ambitious Australia’, final report, March 2026) identifies persistently low business and government R&D investment as a structural weakness in the national innovation system, prompting 20 recommendations to lift it. (Dept. of Industry, Science and Resources, ‘Ambitious Australia: Strategic Examination of Research and Development’, final report, March 2026)",

  "economic-output":
    "Australia's falling share of world GDP reflects faster growth elsewhere, not a shrinking Australian economy: the IMF's April 2026 World Economic Outlook projects China and India growing well above both the global average and the advanced-economy average through 2026. (IMF World Economic Outlook, April 2026 — this gauge's own source series)",

  "debt-burden":
    "The RBA's Financial Stability Review attributes the long-run rise in Australian household debt principally to the mortgage market: the household debt-to-income ratio has risen from around 120% in the mid-2000s to around 140%, alongside rising house prices. (RBA Financial Stability Review, 2025–26 editions) This is the financing side of the same dynamic Housing pressure (Table 1.11) tracks from the price side — see that gauge for the supply-side driver.",

  "housing-pressure":
    "Analysis cited by Treasury and the Productivity Commission attributes Australia's rising price-to-income ratio to an accumulated housing undersupply — estimated at over 200,000 dwellings — compounded by construction-sector labour productivity growing far slower than the rest of the economy (15% since 1994, against a 46% economy-wide average). (Treasury housing supply and affordability analysis; Productivity Commission housing supply inquiry, 2025–26) This is the supply side of the same dynamic Debt burden (Table 1.10) tracks from the financing side — a distinct driver, not a restatement of that gauge's.",

  // Cause-of-the-lead (S2) — demographic-momentum is AUS-leads, not a gap.
  "demographic-momentum":
    "Australia's comparatively high net overseas migration — around 73% of national population growth in the 2024–25 financial year — is the primary driver of its working-age population continuing to grow while several peers' shrink. (ABS, Overseas Migration, 2024–25 financial year)",

  // economic-complexity HELD OUT, not shipped — site owner's ruling: the
  // Growth Lab explaining why its own Atlas ranks Australia low is the
  // measurer commenting on its own measurement, not independent
  // corroboration, and structurally the weakest kind of citation this site
  // could normalise (most index-based gauges could manufacture a CAUSE the
  // same way if a provider's self-gloss cleared the bar). Pending the
  // §3.2 ruling on provider self-commentary specifically. If §3.2 later
  // admits it, restore deliberately — do not silently re-enable.
  //
  // "economic-complexity":
  //   "The Atlas of Economic Complexity's own analysis attributes Australia's low and worsening ranking (74th of 145 economies tracked, second-lowest in the OECD) directly to a lack of export diversification — iron ore, coal, and petroleum gas alone account for roughly two-thirds of net exports. (Harvard Growth Lab, The Atlas of Economic Complexity, country profile: Australia)",
};

/**
 * Draft CONTESTED copy (Attribution.kind: "contested") — applied only
 * where the site's own existing `why-this-matters` content already argues
 * the case, per the site owner's ruling. Drawn from that existing content,
 * not new research. Reviewed and approved by the site owner, 2026-08-20 —
 * same as everything else here.
 */
export const REGISTER_CONTESTED_CAUSES: Record<string, string> = {
  "life-expectancy":
    "Life expectancy folds together healthcare access, chronic disease management, injury prevention, and social conditions into one number — there is no single decomposition that isolates one of these as the dominant driver of Australia's own trajectory. This is not an evidence gap further research would close; it is a property of what this measure is. (See this gauge's own ‘why this matters’ note.)",

  "external-position":
    "Whether Australia's persistent current account deficit reflects financial fragility or a benign pattern of foreign investment financing resource development is a live, unresolved disagreement among economists — this Scorecard's own polarity choice for this gauge is flagged as contestable for the same reason (see Methodology). Any single causal attribution here would be taking a side in that dispute, not reporting a settled one. (See this gauge's own ‘why this matters’ note and the Methodology page.)",
};

/**
 * When PRECEDENT's drafted prose names a specific peer's trajectory, that
 * same peer must be the trajectory chart's comparator line — the chart and
 * the apparatus should never name different countries on the same page
 * (see DESIGN.md "Trajectory chart", and lib/trajectory.ts's
 * `buildTrajectoryView`). Empty today: no gauge has drafted PRECEDENT
 * content yet (deferred — see HANDOVER.md, "PRECEDENT is unexercised
 * across every state"), so there is nothing for a comparator to agree or
 * disagree with. **Standing rule for whoever drafts PRECEDENT next**: add
 * the named peer's ISO code here in the same commit as the PRECEDENT
 * prose, for every gauge whose PRECEDENT names one specific peer (not
 * every PRECEDENT will — some may compare AUS's trajectory to a trend
 * rather than to one named country, in which case this stays unset for
 * that gauge). If the named peer doesn't have enough years of data to
 * qualify as a trajectory-chart comparator, `buildTrajectoryView` falls
 * back to the mechanical nearest-peer pick and records that in
 * `comparatorSource` rather than failing — but that's a real mismatch
 * worth noticing when it happens, not a case to leave silently unequal.
 */
export const REGISTER_PRECEDENT_COMPARATOR: Partial<Record<string, import("@/lib/types").CountryCode>> = {};
