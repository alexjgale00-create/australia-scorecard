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
  /**
   * When the site owner read this file's current wording and approved it
   * as copy — a distinct question from claim-level source verification
   * (see `claims`/`ClaimStatus` above). A file can be copy-approved while
   * still carrying "unverified"/"unresolved" claims: approval means the
   * prose as written is fit to publish, not that every factual assertion
   * in it has been checked against a primary source. Set 2026-08-20 for
   * all 23 gauges below, in one pass — the site owner read every
   * why-this-matters file (assembled for that reading in
   * docs/review-queue.md, since deleted — see HANDOVER.md's
   * merge-readiness section for the review record) and approved the
   * wording without requesting changes.
   */
  copyApprovedAt?: string;
  claims: WhyThisMattersClaim[];
  /**
   * Set whenever a full read-the-file-against-config audit happened, even
   * if it turned up zero checkable claims (e.g. military-capability — pure
   * definitional/framing content, no named report/institution/statistic/
   * year to check). Exists specifically so "audited, genuinely nothing to
   * verify" and "never audited" don't look the same: a gauge with this set
   * and an empty `claims` array was deliberately checked and found clean
   * of checkable assertions; a gauge absent from this record entirely
   * simply hasn't been looked at yet. Optional — most records don't need
   * it, since a non-empty `claims` array already implies an audit happened.
   */
  auditedAt?: string;
}

export const WHY_THIS_MATTERS_RECORDS: Record<string, WhyThisMattersRecord> = {
  "internal-cohesion": {
    writtenAgainst: {
      seriesId: "v2cacamps",
      institution: "V-Dem Institute (via Our World in Data)",
      polarity: "lower_is_better",
      unit: "V-Dem political polarization score (interval scale, mean-centered at 0 across all country-years — not a 0-1 share)",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "This gauge tracks political polarization: V-Dem's own definition is the extent to which a society is divided into hostile political camps that discourage interaction and cooperation across ideological lines.",
        status: "verified",
        source: "V-Dem codebook definition of v2cacamps, already verified and quoted in CLAUDE.md during the 2026-07-16 methodology switch",
        checkedAt: "2026-08-20",
        note: "Rewrite replacing the file's previous description of v2x_cspart (civil society participation), the variable this gauge used before the switch — the file was never updated when the switch happened. See CLAUDE.md for the full incident.",
      },
      {
        claim: "a participatory civil society is one of the more measurable, comparable signals available",
        status: "cut",
        note: "Bucket C (unfalsifiable 'one of the more X available' framing) — moot in practice, since this clause belonged to the pre-rewrite text describing v2x_cspart and was already fully replaced by the construct-mismatch fix above, not separately edited out. Recorded so the bucket-C ruling against this exact phrase isn't lost just because the surrounding sentence happened to be superseded for a different reason first.",
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
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "PM2.5 exposure is genuinely comparable across countries because it's population-weighted, not just a monitoring-station reading",
        status: "verified",
        source: "World Bank DataBank metadata glossary (EN.ATM.PM25.MC.M3) and World Bank feature 'Understanding Air Pollution and the Way It Is Measured': population-weighted exposure is defined by weighting mean annual PM2.5 concentrations by population, produced annually with a consistent methodology specifically to allow cross-country comparison.",
        checkedAt: "2026-08-20",
      },
      {
        claim: "one of the few environmental harms with a direct, well-established line to individual health outcomes",
        status: "cut",
        note: "Bucket C ('one of the few... there is'-style framing). The underlying health-outcome link (cardiovascular/respiratory disease, reduced life expectancy from PM2.5) is real and well-established science, not itself in question — only the unfalsifiable 'one of the few' comparison against every other environmental harm was cut. Rewritten to state the health link directly without the superlative wrapper.",
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
    copyApprovedAt: "2026-08-20",
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
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "PISA tests a representative sample of 15-year-olds across maths, reading, and science every three years, using the same instrument in every participating country",
        status: "verified",
        source: "OECD/NCES PISA methodology and technical notes: 15-year-old age-based (not grade-based) representative sampling, 3-year cycle, same core instrument used across all participating countries within a cycle.",
        checkedAt: "2026-08-20",
        note: "Cross-cycle comparability (as opposed to the cross-country comparability this claim actually makes) has a real caveat — PISA 2015's paper-to-computer mode change and rescaling — logged as a Phase D item in METHODOLOGY.md, not a content error since the claim as written doesn't cover cross-cycle comparability.",
      },
      {
        claim: "one of the few genuinely comparable measures of what school systems are producing",
        status: "cut",
        note: "Bucket C ('one of the few... available' framing).",
      },
      {
        claim: "a preview of the skills entering the workforce over the next decade",
        status: "cut",
        note: "Bucket C (forecasting/interpretive framing, not independently checkable). Rephrased rather than deleted outright: the real, structural point underneath (15-year-olds tested today are literally tomorrow's workforce, which is why this gauge feeds productivity/innovation elsewhere on the site) survives as a plain factual statement, not a 'leading indicator' claim.",
      },
      {
        claim: "Australia's scores have drifted down across multiple PISA cycles, a trend worth watching independent of any single year's result",
        status: "cut",
        note: "Bucket B — replaced with the real cycle-by-cycle values (512 in 2012 to 497 in 2022, data/processed/education.json), self-evidencing rather than asserted.",
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
    copyApprovedAt: "2026-08-20",
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
      {
        claim: "a pattern very different from surplus economies like Germany or South Korea",
        status: "cut",
        note: "Bucket B — replaced with real DEU/KOR current-account values already held (data/processed/external-position.json): DEU roughly +4.5% to +5.9% of GDP, KOR roughly +1.8% to +6.6% of GDP, 2023-2025, both consistently positive against Australia's negative balance.",
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
    copyApprovedAt: "2026-08-20",
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
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "Australia's productivity growth has been a persistent policy worry for over a decade, cited by the Productivity Commission and RBA alike",
        status: "verified",
        source: "RBA named weak productivity a 'material risk' (2026) with a dedicated speech ('Why Productivity Matters', Feb 2025); Productivity Commission's own quarterly report shows labour productivity growth averaging 0.6%/yr (2017/18-2023/24) against 1.6%/yr the prior two decades.",
        checkedAt: "2026-08-20",
      },
      {
        claim: "the long-run engine behind rising living standards",
        status: "cut",
        note: "Bucket D — true but generic (standard growth-accounting truism, not specific to Australia or this gauge's own data), load-bearing for nothing in this file.",
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
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "built from dozens of underlying surveys and expert assessments rather than a single source",
        status: "verified",
        source: "World Bank's own WGI methodology page: 35 cross-country data sources, 400+ underlying indicators, spanning household/firm surveys and expert assessments.",
        checkedAt: "2026-08-20",
        note: "The real number (35 sources) is larger than 'dozens' implies, if anything — the claim understates.",
      },
      {
        claim: "the most widely used cross-country measure of institutional quality",
        status: "cut",
        note: "Bucket C ('most widely used... there is'-style framing, the site owner's own named example). Replaced in content/why-this-matters/rule-of-law-corruption.md with the real, already-verified figure (35 sources, 400+ indicators) rather than left as a gap.",
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
    copyApprovedAt: "2026-08-20",
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
    copyApprovedAt: "2026-08-20",
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
      {
        claim: "Australia entered recent global shocks (the pandemic, rate hikes) with more fiscal room than most peers, even as households carried more leverage than most peers",
        status: "cut",
        note: "Bucket C/D (the site owner flagged this same sentence under both buckets — one clause, cut once). Restates the already-made 'government debt is low' point in narrative form ('more fiscal room than most peers') without adding new information, and 'more fiscal room than most peers' is itself an unquantified comparative claim of exactly the kind bucket C targets.",
      },
    ],
  },

  "innovation": {
    writtenAgainst: {
      seriesId: "GB.XPD.RSDV.GD.ZS",
      institution: "World Bank",
      polarity: "higher_is_better",
      unit: "R&D expenditure (% of GDP)",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "the 2024 Strategic Examination of R&D",
        status: "verified",
        source: "Dept. of Industry, Science and Resources: the Strategic Examination of R&D was commissioned December 2024, but its final report ('Ambitious Australia: Strategic Examination of Research and Development') was published March 2026 — the file's original '2024' framing dated the finding to when the review was commissioned, not when its actual finding was published.",
        checkedAt: "2026-08-20",
        note: "This is the contradicted claim corrected directly in an earlier round (not a triage bucket) — recorded here now that the verification record exists, so this correction isn't the one gauge without a record entry.",
      },
      {
        claim: "Australia has historically spent less on R&D relative to GDP than many high-income peers",
        status: "cut",
        note: "Bucket B — replaced with the real figures already computed for this gauge: AUS 1.86% of GDP vs. peer median 2.99%, rank 8th of 9.",
      },
    ],
  },

  "housing-pressure": {
    writtenAgainst: {
      seriesId: "OECD.ECO.MPD,DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES,1.0",
      institution: "OECD",
      polarity: "lower_is_better",
      unit: "House price-to-income ratio, index",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "Australia — alongside Canada and New Zealand in this comparison set — has become a byword internationally for housing unaffordability",
        status: "cut",
        note: "Bucket C (the site owner's own named example — unfalsifiable 'byword internationally' framing). The Canada/New Zealand comparison was cut along with it rather than kept: it existed only to support the byword claim, and no verified comparative data for CAN/NZL's own trend was in hand to justify keeping a version of it.",
      },
      {
        claim: "capital city prices repeatedly outpacing income growth for over a decade",
        status: "cut",
        note: "Bucket B — replaced with the real AUS price-to-income series already held (data/processed/housing-pressure.json): 85 in 2012 to 120 in 2025.",
      },
    ],
  },

  "cohesion-majority-acceptance": {
    writtenAgainst: {
      seriesId: "WVS7_Q021",
      institution: "World Values Survey Association",
      polarity: "lower_is_better",
      unit: "% who would not want immigrants/foreign workers as neighbours (WVS Q21)",
      evidenceStrength: "survey",
      scoringBasis: "latest-wave-per-country",
    },
    copyApprovedAt: "2026-08-27",
    claims: [
      {
        claim:
          "Germany is the most accepting of the nine on this question and among the most negative on WVS's separate question about immigration's impact on the country",
        status: "verified",
        note:
          "Verified live 2026-08-27 against the WVS Online Analysis tool, both items on the valid base. Q21: DEU 3.9%, the lowest rejection rate of the nine. Q121 (impact of immigrants on the development of the country): DEU 31.2% rather bad + quite bad, the highest of the nine. This inversion is the evidence that the rename is substantive rather than cosmetic — see METHODOLOGY.md.",
      },
      {
        claim: "WVS Wave 7 is the only source covering all nine peers",
        status: "verified",
        note:
          "Verified across four candidate sources in the 2026-08-25 re-verification (ISSP 2023 covers 7 of 9; Ipsos/UNHCR fails on repeatability; Gallup MAI 4 of 9 in its last free wave; Pew ad hoc) and confirmed live 2026-08-27 that Wave 6 covers only 7 of 9, Canada and Great Britain both absent. Scoped to 'covering all nine peers', not to 'the only measure of this concept'.",
      },
    ],
  },
  "economic-output": {
    writtenAgainst: {
      seriesId: "PPPSH",
      institution: "IMF",
      polarity: "higher_is_better",
      unit: "Share of world GDP, PPP (%)",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "shapes its bargaining power in trade negotiations, its voice in forums like the G20, and how much its domestic policy choices ripple internationally",
        status: "cut",
        note: "Bucket C — unfalsifiable claims about diplomatic/negotiating consequences, not independently checkable and not needed to explain what the gauge measures.",
      },
    ],
  },

  "life-expectancy": {
    writtenAgainst: {
      seriesId: "SP.DYN.LE00.IN",
      institution: "World Bank",
      polarity: "higher_is_better",
      unit: "Life expectancy at birth, total (years)",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "the single most integrative health statistic there is",
        status: "cut",
        note: "Bucket C (the site owner's own named example — 'the single most X there is' superlative framing).",
      },
      {
        claim: "a country can't talk its way to a longer average life",
        status: "cut",
        note: "Bucket C (rhetorical flourish). Replaced with a plainer statement of the same real point (the measure is slow-moving, so it reflects sustained conditions rather than a single year's result) without the colourful framing.",
      },
    ],
  },

  "living-standards": {
    writtenAgainst: {
      seriesId: "NY.GDP.PCAP.PP.KD",
      institution: "World Bank",
      polarity: "higher_is_better",
      unit: "GDP per capita, PPP (constant 2021 international $)",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "the closest single number to \"how much material comfort does an average person here have\"",
        status: "cut",
        note: "Bucket C ('the closest single number to...' superlative framing). Rephrased as a plain, unhedged description ('a rough measure of') instead.",
      },
      {
        claim: "it sets the ceiling on what a country can spend on everything else: healthcare, education, defence, leisure",
        status: "cut",
        note: "Bucket D — true but generic (a restatement of what GDP per capita means, not information specific to Australia or this gauge), load-bearing for nothing.",
      },
    ],
  },

  "economic-complexity": {
    writtenAgainst: {
      seriesId: "ECI",
      institution: "Harvard Growth Lab",
      polarity: "higher_is_better",
      unit: "Economic Complexity Index (ECI)",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "commodity-heavy export baskets (Australia's iron ore and coal, historically) are vulnerable to price swings and don't build the same depth of institutional knowhow as complex manufacturing or services",
        status: "cut",
        note: "Bucket D — the general economic-truism half ('vulnerable to price swings... institutional knowhow') is cut; the real, verified figure it was gesturing at (Harvard Growth Lab: iron ore, coal, and petroleum gas account for roughly two-thirds of net exports) replaces it directly in the file.",
      },
      {
        claim: "iron ore, coal, and petroleum gas alone account for roughly two-thirds of net exports",
        status: "cut",
        note: "Superseded 2026-08-20, not a bucket B/C/D triage outcome: the same site-owner ruling that governs CAUSE (two gauges citing one fact reads as boilerplate) applies to why-this-matters copy too. trade measures export composition directly, so it keeps this figure; economic-complexity is about the ECI construct (diversification/sophistication), a different question, and now cites its own real number instead (see the next claim).",
      },
      {
        claim: "Australia ranks 74th of 145 economies on the Harvard Growth Lab's Economic Complexity Index, second-lowest in the OECD",
        status: "verified",
        source: "Harvard Growth Lab / Atlas of Economic Complexity: Australia ranks 74th of 145 economies tracked, second-lowest OECD nation, despite being the 9th-richest economy per capita of the 145.",
        checkedAt: "2026-08-20",
        note: "Replaces the two-thirds-of-net-exports figure in this file specifically — that fact now belongs to trade only. This is a genuinely different fact from the same source (the ECI ranking itself, not the export composition it's partly explained by).",
      },
    ],
  },

  "inequality": {
    writtenAgainst: {
      seriesId: "DSD_WISE_IDD@DF_IDD",
      institution: "OECD",
      polarity: "lower_is_better",
      unit: "Gini coefficient (disposable income, 0-1 scale)",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "a persistently high or rising figure means growth isn't reaching most households even when headline GDP looks healthy",
        status: "cut",
        note: "Bucket D — general economic point about what Gini coefficients mean in the abstract, not Australia-specific information.",
      },
    ],
  },

  "trade": {
    writtenAgainst: {
      seriesId: "NE.EXP.GNFS.CD",
      institution: "World Bank",
      polarity: "higher_is_better",
      unit: "Share of world exports of goods & services (%)",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "a country can grow strongly at home while its share of global trade shrinks simply because other economies are growing and trading faster",
        status: "cut",
        note: "Bucket D — general trade-arithmetic point, not specific new information about Australia.",
      },
      {
        claim: "roughly two-thirds of net exports, per Harvard's Atlas of Economic Complexity",
        status: "verified",
        source: "Harvard Growth Lab / Atlas of Economic Complexity country profile for Australia: iron ore ~38%, coal ~15.5%, petroleum gas ~12.1% of net exports (summed, roughly two-thirds).",
        checkedAt: "2026-08-20",
        note: "This gauge is now the sole owner of this figure — it was cut from economic-complexity.md (2026-08-20) to fix a two-gauges-citing-one-fact collision, since export composition is what trade measures directly while economic-complexity is a different construct (diversification/sophistication, not composition).",
      },
    ],
  },

  "human-capital-depth": {
    writtenAgainst: {
      seriesId: "OECD.EDU.IMEP,DSD_EAG_LSO_EA@DF_LSO_NEAC_DISTR_EA,1.0",
      institution: "OECD",
      polarity: "higher_is_better",
      unit: "Tertiary attainment, 25-34 year-olds (%)",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "A country can have strong school results but a lower tertiary completion rate (or vice versa) depending on its post-school education system and labour market",
        status: "cut",
        note: "Bucket D — a generic possibility statement, not specific to Australia (this gauge has no data yet, so there's no Australian figure it could have been substituted with either).",
      },
    ],
  },

  "life-satisfaction": {
    writtenAgainst: {
      seriesId: "LI (Life evaluation, Average 3-year, mean)",
      institution: "Gallup World Poll, via World Happiness Report",
      polarity: "higher_is_better",
      unit: "Cantril ladder life evaluation, 0–10 scale (Gallup World Poll, 3-year rolling average)",
      evidenceStrength: "survey",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "It's the closest this Scorecard comes to asking Australians directly whether their country is working for them, rather than inferring it from proxies",
        status: "cut",
        note: "Bucket D, partial — the site owner's explicit carve-out: the real structural point ('every other gauge measures something from the outside; this one asks directly') is kept, rewritten plainer. Only the flourish ('the closest this Scorecard comes to', 'whether their country is working for them') was cut, not the underlying distinction.",
      },
    ],
  },

  "demographic-momentum": {
    writtenAgainst: {
      seriesId: "SP.POP.1564.TO",
      institution: "World Bank",
      polarity: "higher_is_better",
      unit: "Working-age population (15-64) growth, % per year",
    },
    copyApprovedAt: "2026-08-20",
    claims: [
      {
        claim: "Several of Australia's peers in this comparison — Japan, South Korea, and Germany — are already grappling with a shrinking working-age population",
        status: "verified",
        source: "This gauge's own real data (data/processed/demographic-momentum.json), 2025: JPN -0.52%/yr, KOR -1.12%/yr, DEU -0.80%/yr — all three genuinely negative (shrinking), not just slow-growing.",
        checkedAt: "2026-08-20",
        note: "Verified during the S2 (AUS-leads) investigation earlier this build, used as the basis for this gauge's CAUSE-of-the-lead draft — recorded formally here now.",
      },
      {
        claim: "Australia's comparatively higher migration intake has historically kept its working-age population growing faster than most peers",
        status: "verified",
        source: "ABS Overseas Migration, 2024-25 financial year: net overseas migration accounted for roughly 73% of Australia's population growth that year.",
        checkedAt: "2026-08-20",
        note: "Same search used for this gauge's CAUSE draft — recorded formally here now.",
      },
    ],
  },

  "military-capability": {
    writtenAgainst: {
      seriesId: "MILEX_GDP_SHARE",
      institution: "SIPRI",
      polarity: "higher_is_better",
      unit: "Military expenditure (% of GDP)",
    },
    copyApprovedAt: "2026-08-20",
    claims: [],
    auditedAt: "2026-08-20",
    // Read against config in full: the file is definitional/framing content
    // only (what military spending is a proxy for, and its limits as a
    // measure) — no named report, institution, statistic, or year to check.
    // Genuinely nothing to verify, not an unaudited gap. The empty claims
    // array plus auditedAt is what distinguishes this from a gauge nobody
    // has looked at yet.
  },
};
