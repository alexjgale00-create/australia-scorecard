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
 *    factual/evaluative assertion in a why-this-matters file, tagged with
 *    a status — including CUT claims, with the bucket and reason, so
 *    nobody re-adds a removed superlative in six months having no idea it
 *    was already considered and rejected.
 * 2. writtenAgainst — the guard against the internal-cohesion class of
 *    bug. The subset of GaugeConfig this file's prose actually depends
 *    on, recorded at time of writing/review. lib/content.ts's
 *    getWhyThisMatters compares this against live config on every build
 *    and throws if they disagree — see assertWrittenAgainst there for
 *    the actual check.
 *
 * SCHEMA-INTEGRITY ONLY, NOT A COMPLETENESS MANDATE: only gauges that
 * have actually been audited get an entry here. A gauge with no entry is
 * simply unchecked — not flagged, not blocked.
 */

/**
 * See the module comment above (GaugeConfig subset rationale) for what's
 * included/excluded and why.
 */
export interface WrittenAgainst {
  seriesId: string;
  institution: string;
  polarity: Polarity;
  unit: string;
  scoringBasis?: ScoringBasis;
  evidenceStrength?: EvidenceStrength;
}

/**
 * Four states, deliberately distinct — the two added this round
 * ("partial", "unresolved") are easy to confuse with each other and with
 * "unverified" if their meanings aren't pinned down, so:
 *
 *   - "verified": checked against a primary source; the claim as written
 *     holds. Requires `source` and `checkedAt`.
 *   - "unverified": nobody has looked yet. The default for everything
 *     not yet audited — most claims on this site right now. No `source`,
 *     no `checkedAt` — there's nothing to cite.
 *   - "partial": checked, and a primary source exists — but the claim as
 *     WRITTEN overclaims relative to what that source actually supports
 *     (one word doing work the evidence won't carry, e.g. "historically"
 *     asserting a constancy the source shows was actually a shifting
 *     pattern). The substance survives, rewritten; requires `source` AND
 *     a `note` naming exactly which part failed. This is NOT the same as
 *     "unverified" — it's the outcome of a real check, just not a clean
 *     pass.
 *   - "unresolved": checked, genuinely — a real attempt was made to find
 *     a primary source — and none was found that actually settles the
 *     claim (as opposed to circumstantial signal, or an aggregator
 *     republishing a primary source rather than being one). Requires a
 *     `note` stating exactly where the search looked and why each
 *     attempt fell short. Also NOT the same as "unverified": this claim
 *     WAS investigated; the investigation just didn't reach a source
 *     that could confirm or deny it.
 *   - "contested": attribution is actively disputed by real sources on
 *     both sides, or is a values/framing question with no fact to check
 *     (see CAUSE's own "contested" Attribution kind — same idea, applied
 *     to a why-this-matters claim rather than an apparatus attribution).
 *   - "cut": removed. `note` records the triage bucket (B/C/D) and why,
 *     so a removed superlative or redundant line doesn't quietly get
 *     re-added later by someone who doesn't know it was already
 *     considered and rejected.
 */
export type ClaimStatus = "verified" | "unverified" | "partial" | "unresolved" | "contested" | "cut";

export interface WhyThisMattersClaim {
  /** The exact clause, quoted from the file (or, for "cut", the clause as it existed before removal), so it's traceable back to the source text. */
  claim: string;
  status: ClaimStatus;
  /** Required for "verified" and "partial". */
  source?: string;
  /** Required for "verified" and "partial". ISO date. */
  checkedAt?: string;
  /** Required for "partial" (which part fails), "unresolved" (where the search looked and why it fell short), "cut" (bucket + reason), and "contested" (what's disputed). */
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

  "air-quality": {
    writtenAgainst: {
      seriesId: "EN.ATM.PM25.MC.M3",
      institution: "World Bank (IHME Global Burden of Disease)",
      polarity: "lower_is_better",
      unit: "PM2.5 air pollution, mean annual exposure (micrograms per cubic meter)",
    },
    claims: [
      {
        claim: "PM2.5 exposure is genuinely comparable across countries because it's population-weighted, not just a monitoring-station reading",
        status: "verified",
        source: "World Bank DataBank metadata glossary (EN.ATM.PM25.MC.M3) and World Bank feature 'Understanding Air Pollution and the Way It Is Measured': population-weighted exposure is defined by weighting mean annual PM2.5 concentrations by population, produced annually with a consistent methodology specifically to allow cross-country comparison.",
        checkedAt: "2026-08-20",
      },
    ],
  },

  "cohesion-minority-experience": {
    writtenAgainst: {
      seriesId: "v2clsocgrp",
      institution: "V-Dem Institute (via Our World in Data)",
      polarity: "higher_is_better",
      unit: "V-Dem social group equality in civil liberties score (interval scale, mean-centered at 0 across all country-years — not a 0-1 share)",
    },
    claims: [
      {
        claim: "measures whether a country's minority groups... actually get the same civil liberties as everyone else in practice: freedom of movement, property rights, access to justice, freedom from forced labour",
        status: "verified",
        source: "V-Dem's own definition of v2clsocgrp: 'the extent to which social groups... are free from forced labor, have property rights and access to the justice system, and enjoy freedoms of movement' — near-exact match.",
        checkedAt: "2026-08-20",
      },
    ],
  },

  "education": {
    writtenAgainst: {
      seriesId: "PISA_MEAN",
      institution: "OECD PISA",
      polarity: "higher_is_better",
      unit: "PISA mean score (maths, reading, science average)",
    },
    claims: [
      {
        claim: "PISA tests a representative sample of 15-year-olds across maths, reading, and science every three years, using the same instrument in every participating country",
        status: "verified",
        source: "OECD/NCES PISA methodology and technical notes: 15-year-old age-based (not grade-based) representative sampling, 3-year cycle, same core instrument used across all participating countries within a cycle.",
        checkedAt: "2026-08-20",
        note: "Cross-cycle comparability (as opposed to the cross-country comparability this claim actually makes) has a real caveat — PISA 2015's paper-to-computer mode change and rescaling — logged as a Phase D item in METHODOLOGY.md, not a content error since the claim as written doesn't cover cross-cycle comparability.",
      },
    ],
  },

  "external-position": {
    writtenAgainst: {
      seriesId: "BN.CAB.XOKA.GD.ZS",
      institution: "World Bank",
      polarity: "higher_is_better",
      unit: "Current account balance (% of GDP)",
    },
    claims: [
      {
        claim: "Australia has run current account deficits for most of the post-war era",
        status: "verified",
        source: "RBA RDP 2007-02 'Current Account Deficits: The Australian Debate — The History of Australia's Current Account': 'Australia has had current account deficits for most of the post-war period' (near-verbatim match).",
        checkedAt: "2026-08-20",
      },
      {
        claim: "historically financed by foreign investment in mining and resources",
        status: "partial",
        source: "RBA RDP 2007-02 and RBA 'Trends in Australia's Balance of Payments' explainer.",
        checkedAt: "2026-08-20",
        note: "The word 'historically' overclaims a constancy the RBA's own account doesn't support. Foreign investment does finance the deficit (real), but its composition shifted from equity-heavy (1960s-80s) to debt-heavy (after 1980), and the specific mining/resources framing is really a recent-decades story (2000s+ resources boom, China/India demand), not uniform across the whole post-war era. Rewritten in content/why-this-matters/external-position.md to state the real shape instead of the overclaim.",
      },
    ],
  },

  "personal-safety": {
    writtenAgainst: {
      seriesId: "VC.IHR.PSRC.P5",
      institution: "UNODC, via World Bank",
      polarity: "lower_is_better",
      unit: "Intentional homicide rate (per 100,000 population)",
    },
    claims: [
      {
        claim: "a body count is hard to under-report",
        status: "verified",
        source: "UNODC Global Study on Homicide: 'homicide is expected to be the crime type least likely to go undetected when conducting cross-national comparisons.'",
        checkedAt: "2026-08-20",
      },
      {
        claim: "or redefine away",
        status: "partial",
        source: "UNODC Global Study on Homicide.",
        checkedAt: "2026-08-20",
        note: "Overclaims immunity to a real, UNODC-documented limitation: 'statistical counting rules and legal definitions for homicide vary widely across countries... compromising cross-national comparability' — countries using different recording systems show 13-15% count differences on this basis alone. Rewritten in content/why-this-matters/personal-safety.md to acknowledge this rather than assert the data is clean of it.",
      },
      {
        claim: "the most reliably reported violent crime there is",
        status: "cut",
        note: "Bucket C (superlative framing, applied in the B/C/D pass) — 'there is' asserts a comparison against every violent crime category everywhere, not supportable and not what the substance claim (hard to under-report) actually needs.",
      },
    ],
  },

  "productivity": {
    writtenAgainst: {
      seriesId: "OECD.SDD.TPS,DSD_PDB@DF_PDB_LV,1.0",
      institution: "OECD",
      polarity: "higher_is_better",
      unit: "GDP per hour worked (USD, constant prices, 2015 PPPs)",
    },
    claims: [
      {
        claim: "Australia's productivity growth has been a persistent policy worry for over a decade, cited by the Productivity Commission and RBA alike",
        status: "verified",
        source: "RBA named weak productivity a 'material risk' (2026) with a dedicated speech ('Why Productivity Matters', Feb 2025); Productivity Commission's own quarterly report shows labour productivity growth averaging 0.6%/yr (2017/18-2023/24) against 1.6%/yr the prior two decades.",
        checkedAt: "2026-08-20",
      },
    ],
  },

  "rule-of-law-corruption": {
    writtenAgainst: {
      seriesId: "GOV_WGI_RL.EST + GOV_WGI_CC.EST (averaged)",
      institution: "World Bank (Worldwide Governance Indicators)",
      polarity: "higher_is_better",
      unit: "WGI Rule of Law + Control of Corruption, averaged (estimate, -2.5 to +2.5)",
    },
    claims: [
      {
        claim: "built from dozens of underlying surveys and expert assessments rather than a single source",
        status: "verified",
        source: "World Bank's own WGI methodology page: 35 cross-country data sources, 400+ underlying indicators, spanning household/firm surveys and expert assessments.",
        checkedAt: "2026-08-20",
        note: "The real number (35 sources) is larger than 'dozens' implies, if anything — the claim understates.",
      },
    ],
  },

  "work-life-balance": {
    writtenAgainst: {
      seriesId: "OECD.ELS.SAE,DSD_HW@DF_AVG_ANN_HRS_WKD,1.0",
      institution: "OECD",
      polarity: "lower_is_better",
      unit: "Average annual hours actually worked per worker",
    },
    claims: [
      {
        claim: "OECD's own commentary on this indicator uses the same reading [fewer hours is better]",
        status: "unresolved",
        note: "Searched for OECD's own stated position on this indicator specifically. Found plenty of third-party commentary (Visual Capitalist, InstaRem, Voronoi, etc.) associating fewer hours with stronger labour laws/work-life balance emphasis, consistent with the claim — but no direct statement from OECD itself making this reading of its own indicator. Declined to infer OECD's position from others describing OECD's data. Not re-attempted beyond this session's search.",
      },
    ],
  },

  "debt-burden": {
    writtenAgainst: {
      seriesId: "WS_TC (Total Credit), borrower sectors H+G summed",
      institution: "Bank for International Settlements (BIS)",
      polarity: "lower_is_better",
      unit: "Household + government debt, % of GDP (BIS Total Credit)",
    },
    claims: [
      {
        claim: "household debt relative to income and GDP is among the highest of any developed economy",
        status: "unresolved",
        note: "Site owner's explicit bar: cite BIS directly (the primary source for this exact metric) or mark unresolved — data aggregators (CEIC, TradingEconomics, TheGlobalEconomy, comparethemarket, finder, etc.) republishing BIS/IMF series don't count as independent confirmation, however many of them converge. Five attempts, all falling short of that bar: (1) BIS's own data portal directly — an interactive portal, no readable ranking/figure extracted; (2) the underlying BIS series via FRED — blocked, HTTP 403; (3) OECD Economic Surveys: Australia 2026 (January 2026), identified as a strong candidate primary source via search — PDF returned unreadable binary content, and OECD's own household-debt indicator page returned HTTP 403, leaving only a search tool's paraphrase, not text read directly (see the V-Dem/OWID precedent in CLAUDE.md for why that specific gap matters here); (4) a site-restricted search for an RBA or Treasury statement on household debt specifically (the domain that worked for the government-debt claim below) — returned no RBA/Treasury result, only more aggregators; (5) IMF surfaced as another named source in aggregator text ('according to the International Monetary Fund') but not pursued to a fetchable IMF document within this session. Genuinely unresolved, not inferred — a specific, fetchable IMF citation is the most promising next attempt if this is revisited.",
      },
      {
        claim: "Government debt, by contrast, is comparatively low by international standards",
        status: "verified",
        source: "Australian Government Treasury Ministers media release (Jim Chalmers, 2022, page live/current as checked), fetched directly (not search-tool synthesis): 'Australia also has the fifth lowest gross debt to GDP ratio in the G20 in 2024.'",
        checkedAt: "2026-08-20",
        note: "First attempt failed the same bar as the household-debt claim — OECD's own indicator page and RBA's explainer both returned HTTP 403 to direct fetch, leaving only search-tool synthesis in hand, which wasn't accepted. Second attempt via Treasury/Budget Papers (a different domain, fetchable this session) succeeded: this is real, directly-read primary-source text, not a paraphrase. Scope caveat: this source states gross debt among the G20 (5th lowest), not specifically the OECD, and not the exact BIS 'general government debt' series this gauge's config uses — a real but narrow gap between what's cited and the gauge's precise measure, not a mismatch in substance.",
      },
    ],
  },
};
