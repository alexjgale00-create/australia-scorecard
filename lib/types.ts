export type Polarity = "higher_is_better" | "lower_is_better";

export type AccessType = "api" | "manual";

/**
 * Phase E: the site scores two independent dimensions — "power" (national
 * trajectory, the original 16-gauge composite) and "quality-of-life" (is
 * Australia still a good place to live). They share every mechanism
 * (scoring, maturity, provenance) but are never combined into one number —
 * see METHODOLOGY.md's "Quality of Life dimension" section.
 */
export type DimensionId = "power" | "quality-of-life";

export interface DimensionConfig {
  id: DimensionId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
}

/**
 * How a gauge's cross-country comparison is built. Almost every gauge uses
 * "same-year" (the default when omitted): every country's value from the
 * same shared year, per latestSharedYear. "latest-wave-per-country" is a
 * deliberate, disclosed departure — each country's own most recent
 * available value is compared, even when countries' values come from
 * different calendar years — used only for attitude-survey gauges whose
 * source fields irregular, non-synchronized waves per country (e.g.
 * cohesion-majority-acceptance's Gallup Migrant Acceptance Index). See
 * describeScoringBasis in lib/scoring.ts and METHODOLOGY.md — this must
 * never be a fact only readable in code, per the site owner's explicit
 * ruling.
 */
export type ScoringBasis = "same-year" | "latest-wave-per-country";

/** Hard statistics are the unmarked default; survey/attitude data gets a quiet "Survey-based" tag — see EvidenceTag. */
export type EvidenceStrength = "hard-statistic" | "survey";

export type CountryCode =
  | "AUS"
  | "CAN"
  | "GBR"
  | "NZL"
  | "KOR"
  | "NLD"
  | "USA"
  | "DEU"
  | "JPN";

export interface GaugeConfig {
  id: string;
  name: string;
  shortName: string;
  oneLiner: string;
  unit: string;
  historyStartYear: number;
  accessType: AccessType;
  polarity: Polarity;
  polarityJustification: string;
  /**
   * Which dimension(s) this gauge feeds, and its weight within each. A
   * gauge with more than one key here is deliberately reused across
   * dimensions (e.g. housing-pressure, scored in both Power and Quality of
   * Life) — always with its own `reuseNote` disclosing why. A dimension not
   * present as a key here simply doesn't include this gauge; that's the
   * single source of truth for dimension membership, not a separate list
   * that could drift out of sync with the weights.
   */
  weights: Partial<Record<DimensionId, number>>;
  /**
   * Set only on a gauge reused across more than one dimension — the
   * disclosure shown on every one of that gauge's dimension pages, plus
   * /status and METHODOLOGY.md, per the site owner's explicit condition
   * that reuse must never be silent.
   */
  reuseNote?: string;
  /**
   * Dimension(s) this gauge appears on for display/grouping — its own
   * card in that dimension's gauge grid, its own detail page — WITHOUT
   * being scored or counted in that dimension's composite. Deliberately
   * separate from `weights`, which is both membership *and* the composite
   * weight: a gauge here has no entry in `weights` for the same
   * dimension, so it's structurally excluded from every composite
   * calculation (computeComposite, computeCompositeForAllCountries,
   * computeHistoricalComposite already skip any gauge with no weight for
   * the dimension in question — no extra "if unscored, skip" branch
   * needed, exclusion follows from absence). A gauge here still shows its
   * real data — first use case: cohesion-majority-acceptance, where only
   * 4 of 9 peers have a 2019 wave and those four are precisely the
   * highest scorers, so any computed score would be structurally biased
   * upward. `unscoredReason` is mandatory alongside this — never render
   * "not scored" without saying why.
   */
  unscoredDimensions?: DimensionId[];
  /** Required alongside unscoredDimensions — the plain-English reason shown prominently on the gauge's own card and detail page. */
  unscoredReason?: string;
  /** Defaults to "same-year" when omitted — see ScoringBasis. */
  scoringBasis?: ScoringBasis;
  /** Defaults to "hard-statistic" when omitted — see EvidenceStrength. */
  evidenceStrength?: EvidenceStrength;
  /** A source-specific data-handling rule worth surfacing (e.g. excluding forecast years) — shown on the Methodology page alongside polarity. */
  dataPolicy?: string;
  /**
   * Overrides the generic "due for a refresh" staleness copy for a manual
   * gauge whose real state isn't "overdue on a normal cadence" — e.g.
   * cohesion-majority-acceptance, whose last freely-published wave is 7
   * years old because no newer comparable public wave exists, not because
   * anyone forgot to re-download it. Always shown verbatim wherever manual
   * staleness would otherwise render — see lib/maturity.ts.
   */
  staleDisclosure?: string;
  /**
   * For accessType "manual" gauges only: how many months old this gauge's
   * data can get before the monthly pipeline report flags it as due for a
   * refresh. Deliberately per-gauge, not a blanket rule — a 3-4-yearly
   * source (PISA) and an annual one (SIPRI) have very different "stale"
   * thresholds. Falls back to 15 months if omitted.
   */
  staleAfterMonths?: number;
  /**
   * Hand-set maturity override for a gauge whose tier can't be correctly
   * auto-derived from provenance alone — e.g. a standing environment
   * limitation that caps how "established" a gauge can honestly claim to
   * be, even though its data is real and repeatedly refreshed. Only "live"
   * or "provisional" are valid targets: an override can hold a gauge back,
   * never promote it to Established (that must be earned) or fabricate
   * Awaiting data (that's determined by data presence alone). `reason` is
   * mandatory and always displayed on /status — see CLAUDE.md's maturity
   * honesty rules.
   */
  maturityOverride?: {
    tier: "live" | "provisional";
    reason: string;
  };
  /**
   * REGISTER's citable table numbers (R8 — "Table 1.4 is the citable
   * identifier and /table/1.4 resolves to it"). Explicit, stored, never
   * derived from array position or recomputed, because a citation that
   * shifts when a gauge is reordered or added is worse than none.
   *
   * EXACTLY ONE ENTRY, always — one gauge, one plate, no exceptions. A
   * gauge reused across dimensions (see `weights`) still gets only one:
   * its primary dimension's. A dimension key present in `weights` but
   * absent here means that dimension's overview page renders this gauge as
   * a cross-reference row (name + "scored in [primary dimension]" + a link
   * to its real plate), never a second citable number — two routes serving
   * identical content is both an R8 violation and a duplicate-content
   * problem. housing-pressure is the only current case: `{ power: "1.11" }`
   * only, even though it's also weighted in quality-of-life. Once assigned,
   * a plate is permanent: if a gauge is retired, its number retires with it
   * and is never reissued.
   */
  plates: Partial<Record<DimensionId, string>>;
  /**
   * How this gauge's band strip positions peers spatially. Defaults to
   * "linear" (the ordinary case) when omitted. Human-set only, never
   * auto-detected from the data — same convention as staleAfterMonths —
   * and applied sparingly: a declared exception only reads as one if most
   * gauges don't need it. See DESIGN.md's axis-treatment ruling for why a
   * scrollable or silently-rescaled axis was rejected, and CLAUDE.md's
   * min-max normalisation finding for which gauges currently qualify.
   */
  axisTreatment?: {
    mode: "linear" | "outlier-note";
    /**
     * Required when mode is "outlier-note": the peer excluded from the
     * strip's spatial scale and declared instead in a fixed-width sidecar
     * badge (true value + multiple over the next-highest peer). Never
     * assume this is USA in component code — on some gauges it may not be.
     * The badge's position (BEHIND end vs AHEAD end of the track) follows
     * which end this country's value actually falls on for this gauge's
     * polarity, never defaults to one side.
     */
    outlierCountry?: CountryCode;
  };
  /**
   * Declares when this gauge's band assignment for Australia is NOT robust
   * to a specific peer's position dominating the min-max bounds — a
   * one-line, read-only sensitivity check (exclude one country from the
   * bounds only; the shipped score, band, and composite never change).
   * Defaults to robust when omitted. Set to "outlier-dependent" only where
   * that test showed the band moving AND the currently-displayed band
   * overstates Australia's position — a band that understates is judged
   * survivable and left as the default; see CLAUDE.md for the full
   * finding and ruling. This is disclosure, not correction: nothing here
   * changes what computeLevelScore/bandForScore produce, it only decides
   * whether a declared qualifier renders next to the band. See
   * Methods §3.3 for what the sensitivity check means and how it's run.
   */
  bandRobustness?: {
    status: "robust" | "outlier-dependent";
    /** Required when status is "outlier-dependent": the band this gauge would show with `dependsOnCountry` excluded from the bounds, computed once by hand, never live-recomputed. */
    alternateBand?: string;
    /** Required when status is "outlier-dependent": which peer's position is doing the work. */
    dependsOnCountry?: CountryCode;
    /** Methods section anchor cited in the declared qualifier, e.g. "§3.3". */
    methodsRef?: string;
    /** Optional free-text record of why this status was set — e.g. trade's "robust" is structural (no USA data that year), not merely tested-and-stable, worth recording so a future reader doesn't wonder why it's marked explicitly. */
    note?: string;
  };
  source: {
    institution: string;
    seriesId: string;
    seriesName: string;
    url: string;
    /** When a gauge combines multiple raw indicators into one value (e.g. averaging two WGI estimates), lists each contributing series. */
    componentSeriesIds?: { id: string; name: string }[];
  };
}

export interface ScoreBand {
  id: string;
  label: string;
  min: number;
  max: number;
  /**
   * @deprecated Under the REGISTER design system (2026), no colour may ever
   * encode a band, value, or rank (R1 — see DESIGN.md). This field is kept,
   * unremoved, only because the pre-REGISTER components (GaugeCard, DotStrip,
   * RankChart, TimeSeriesChart) still read it and are not yet retired — see
   * DESIGN.md's implementation addendum on staged rollout. No REGISTER
   * component (`components/Gauge.tsx` and anything built alongside it) may
   * import or render this field. Remove it, and this comment, only once
   * every pre-REGISTER component that reads it has actually been retired —
   * not before.
   */
  color: string;
  /**
   * The severity tick glyph for this band (e.g. "∙∙∙∙∙"), tertiary channel
   * only per R2 — position and the glyph itself carry the meaning, weight
   * and rule thickness never do alone. Human-set per band, most ticks on
   * the worst band, fewest on the best — see DESIGN.md "R2 — Severity
   * channel order."
   */
  ticks: string;
}

export interface GaugesConfigFile {
  peerCountries: { code: CountryCode; name: string }[];
  /** Threshold for the raw-value trend shown in the detail page's "Two ways to read this" block. Not used for the site's primary direction arrows. */
  directionThresholdPctPerYear: number;
  /** Threshold for the peer-relative direction — the primary "improving/flat/deteriorating" basis used everywhere (cards, dot strips, What's Moving). */
  directionThresholdScorePointsPerYear: number;
  /** The two independently-scored dimensions — see DimensionConfig. Order here is display order (Power first, matching the site's original identity). */
  dimensions: DimensionConfig[];
  /** Shared by both dimensions' composites — still provisional pending Phase D, which will decide whether the two dimensions ever need separate bands. */
  scoreBands: ScoreBand[];
  gauges: GaugeConfig[];
}

export type DataStatus = "SAMPLE_DATA" | "LIVE";

export interface SeriesPoint {
  year: number;
  value: number;
}

export interface CountrySeries {
  name: string;
  series: SeriesPoint[];
}

export interface MissingCountry {
  code: CountryCode;
  name: string;
  reason: string;
}

/**
 * A supplementary metric shown alongside a gauge for context — never
 * scored, never part of the composite. Currently used by Inequality (OECD
 * Gini scores the gauge; WID's wealth-share sits here as context) — see
 * CLAUDE.md for why the two weren't blended into one score.
 */
export interface ContextSeries {
  label: string;
  unit: string;
  institution: string;
  url: string;
  retrievedAt: string | null;
  note?: string;
  countries: Partial<Record<CountryCode, CountrySeries>>;
}

export interface GaugeData {
  gaugeId: string;
  provenance: {
    status: DataStatus;
    institution: string;
    seriesId: string;
    seriesName: string;
    url: string;
    retrievedAt: string | null;
    note: string;
    /**
     * Structured record of any of the 9 peer countries this gauge has no
     * usable data for, with a specific reason each. A dot strip or detail
     * page rendering this gauge must surface every entry here — never
     * render a "9-country" visual that's silently missing one.
     */
    missingCountries?: MissingCountry[];
    /**
     * How many times this gauge has been successfully re-fetched by a real,
     * unattended scheduled pipeline run (GITHUB_EVENT_NAME === "schedule")
     * since it first went LIVE — written by pipeline/lib/writeGaugeData.mjs.
     * Deliberately excludes workflow_dispatch and local `npm run pipeline`
     * runs: those prove the fetcher code works, not that it keeps working
     * unattended over real time. See lib/maturity.ts and CLAUDE.md.
     */
    scheduledRefreshCount?: number;
    /** Timestamp of the most recent successful scheduled refresh, or null if none yet. */
    lastScheduledRefreshAt?: string | null;
  };
  countries: Partial<Record<CountryCode, CountrySeries>>;
  /**
   * Optional, gauge-specific — see ContextSeries. Absent for every gauge
   * except where explicitly wired up. An array (not a single block) since
   * Phase E's cohesion-majority-acceptance gauge is planned to carry two
   * (Scanlon Foundation, Australia-only; Eurobarometer, NLD/DEU-only) —
   * see METHODOLOGY.md.
   */
  contextSeries?: ContextSeries[];
}

/**
 * "insufficient-history" is distinct from both "flat" (a real trend was
 * computed and it happens to be small) and null/"no trend data" (no
 * comparable data exists at all) — it means real data exists but too
 * little of it, spaced too irregularly, to trust a computed trend. Currently
 * only reachable via the "latest-wave-per-country" scoring basis — see
 * ScoringBasis and computeGaugeScore in lib/scoring.ts. Must render
 * visually distinct from both neighbours wherever direction is shown — see
 * DirectionArrow.
 */
export type Direction = "improving" | "flat" | "deteriorating" | "insufficient-history";

export interface GaugeScore {
  gaugeId: string;
  latestYear: number;
  levelScore: number | null;
  direction: Direction | null;
  australiaRank: number | null;
  peerCount: number;
}

export interface CountryScorePoint {
  code: CountryCode;
  name: string;
  score: number;
  /**
   * Set only for gauges scored on the "latest-wave-per-country" basis: the
   * calendar year this specific country's value actually comes from, since
   * — unlike every same-year gauge — that year can differ dot to dot.
   * DotStrip shows it in the tooltip when present, so the departure from
   * the site's usual same-year comparison is visible, not just documented.
   */
  asOfYear?: number;
}

export interface LevelScoreDelta {
  startYear: number;
  endYear: number;
  delta: number;
}

/** Purely descriptive (no good/bad judgment) — a raw value going "up" isn't necessarily good; that depends on polarity. */
export type RawDirection = "up" | "down" | "flat";

export interface RawValueTrend {
  startYear: number;
  endYear: number;
  startValue: number;
  endValue: number;
  totalPctChange: number;
  annualizedPct: number;
  direction: RawDirection;
}

export interface PeerRelativeTrend extends LevelScoreDelta {
  annualizedDelta: number;
  direction: Direction;
}

export interface CompositeResult {
  composite: number | null;
  improving: number;
  deteriorating: number;
  flat: number;
  /** Gauge IDs that actually fed the weighted average. */
  includedGaugeIds: string[];
  /**
   * Gauge IDs with a null level score, excluded from the weighted average.
   * Non-empty here obligates the caller to render a disclosure — see
   * buildCompositeDisclosure / assertCompositeDisclosure in lib/scoring.ts.
   * Silent exclusion is never acceptable.
   */
  excludedGaugeIds: string[];
}
