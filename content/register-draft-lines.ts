/**
 * Draft plain-language lines — REGISTER's Tier 1 "plain-language line"
 * slot (see DESIGN.md). Generated, not written: each sentence states only
 * Australia's own value, the peer median, and Australia's rank — pure
 * arithmetic, no causal or evaluative language, per the site owner's
 * explicit condition for what's safe to auto-draft.
 *
 * Reviewed and approved by the site owner, 2026-08-20 — see HANDOVER.md's
 * merge-readiness section for the review record.
 */
export const REGISTER_DRAFT_LINES: Record<string, string> = {
  "living-standards": "Australia's living standards is 60194 (GDP per capita); the peer median is 56843. Australia ranks 4th of 9.",
  "productivity": "Australia's productivity is 61.21 (GDP per hour worked); the peer median is 57.01. Australia ranks 4th of 9.",
  "education": "Australia's education is 497 (PISA mean score); the peer median is 495. Australia ranks 4th of 9.",
  "innovation": "Australia's innovation is 1.86 (R&D expenditure); the peer median is 2.99. Australia ranks 8th of 9.",
  "external-position": "Australia's external position is -2.68 (Current account balance); the peer median is -0.95. Australia ranks 6th of 8.",
  "rule-of-law-corruption": "Australia's rule of law & corruption is 1.66 (WGI Rule of Law + Control of Corruption); the peer median is 1.49. Australia ranks 4th of 9.",
  "demographic-momentum": "Australia's demographic momentum is 1.23 (Working-age population); the peer median is 0.12. Australia ranks 1st of 9.",
  "trade": "Australia's trade is 1.2 (Share of world exports of goods & services); the peer median is 3.08. Australia ranks 6th of 6.",
  "economic-output": "Australia's economic output is 0.95 (Share of world GDP); the peer median is 1.89. Australia ranks 7th of 9.",
  "debt-burden": "Australia's debt burden is 165 (Household + government debt); the peer median is 162. Australia ranks 5th of 8 (lower is better on this gauge).",
  "housing-pressure": "Australia's housing pressure is 120 (House price-to-income ratio); the peer median is 121. Australia ranks 4th of 7 (lower is better on this gauge).",
  "military-capability": "Australia's military capability is 1.92 (Military expenditure); the peer median is 2.23. Australia ranks 6th of 9.",
  "economic-complexity": "Australia's economic complexity is 0.12 (Economic Complexity Index); the peer median is 1.18. Australia ranks 9th of 9.",
  "internal-cohesion": "Australia's internal cohesion is -1.16 (V-Dem political polarization score); the peer median is -0.19. Australia ranks 3rd of 9 (lower is better on this gauge).",
  "life-expectancy": "Australia's life expectancy is 83.05 (Life expectancy at birth); the peer median is 81.99. Australia ranks 3rd of 9.",
  "life-satisfaction": "Australia's life satisfaction is 6.92 (Cantril ladder life evaluation); the peer median is 6.78. Australia ranks 3rd of 9.",
  "personal-safety": "Australia's personal safety is 0.85 (Intentional homicide rate); the peer median is 0.8. Australia ranks 4th of 7 (lower is better on this gauge).",
  "work-life-balance": "Australia's work-life balance is 1651 (Average annual hours actually worked per worker); the peer median is 1783. Australia ranks 2nd of 4 (lower is better on this gauge).",
  "air-quality": "Australia's air quality is 6.41 (PM2.5 air pollution); the peer median is 8.7. Australia ranks 1st of 9 (lower is better on this gauge).",
  "cohesion-minority-experience": "Australia's cohesion — minority experience is 1.33 (V-Dem social group equality in civil liberties score); the peer median is 1.7. Australia ranks 6th of 9."
};

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
